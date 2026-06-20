package handlers

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"

	"ischat/config"
	"ischat/database"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Fungsi pembantu untuk mengambil secret key secara dinamis
func getSecretKey() []byte {
	return []byte(config.GetEnv("AES_SECRET_KEY"))
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Menyimpan koneksi WebSocket aktif berdasarkan User ID
var clients = make(map[string]*websocket.Conn)
var mu sync.Mutex

// Type: "message" | "status"
type SocketMessage struct {
	Type       string `json:"type,omitempty"`
	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id,omitempty"`
	Text       string `json:"text,omitempty"`
	Status      string `json:"status,omitempty"` // "online" | "offline"
	IsTyping    bool   `json:"is_typing,omitempty"`
	IsDelivered bool   `json:"is_delivered,omitempty"`
	IsRead      bool   `json:"is_read,omitempty"`
	MessageID   string `json:"message_id,omitempty"` // ID pesan untuk aksi hapus/edit
}

// ==========================================
// FUNGSI KRIPTOGRAFI (AES-GCM)
// ==========================================

// Fungsi Enkripsi AES-GCM agar data teks di database tidak bocor
func encrypt(text string) (string, string, error) {
	block, err := aes.NewCipher(getSecretKey())
	if err != nil {
		return "", "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", "", err
	}
	ciphertext := gcm.Seal(nil, nonce, []byte(text), nil)
	return hex.EncodeToString(ciphertext), hex.EncodeToString(nonce), nil
}

// Fungsi Dekripsi AES-GCM untuk mengembalikan ciphertext ke teks asli saat dibaca user
func decrypt(cipherTextHex, nonceHex string) (string, error) {
	block, err := aes.NewCipher(getSecretKey())
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	ciphertext, err := hex.DecodeString(cipherTextHex)
	if err != nil {
		return "", err
	}
	nonce, err := hex.DecodeString(nonceHex)
	if err != nil {
		return "", err
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// ==========================================
// PRESENCE HELPERS
// ==========================================

// IsUserOnline dipakai oleh contact_handler.go & user_handler.go untuk cek status real-time
func IsUserOnline(userID string) bool {
	mu.Lock()
	defer mu.Unlock()
	_, ok := clients[userID]
	return ok
}

// broadcastStatus mengirim status online/offline ke SEMUA client yang sedang terhubung
func broadcastStatus(userID string, status string) {
	mu.Lock()
	defer mu.Unlock()

	payload := SocketMessage{
		Type:     "status",
		SenderID: userID,
		Status:   status,
	}

	for uid, conn := range clients {
		if uid == userID {
			continue // jangan kirim status dirinya sendiri ke dirinya sendiri
		}
		_ = conn.WriteJSON(payload)
	}
}

// ==========================================
// HANDLER UTAMA CHAT
// ==========================================

// HandleConnections menangani siklus hidup koneksi WebSocket yang real-time
func HandleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Gagal upgrade ke WebSocket:", err)
		return
	}
	defer ws.Close()

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		fmt.Println("Koneksi ditolak: user_id kosong")
		return
	}

	mu.Lock()
	clients[userID] = ws
	mu.Unlock()

	fmt.Printf("User terhubung ke WebSocket: %s\n", userID)

	// 🔔 Broadcast: user ini sekarang ONLINE ke semua client lain
	broadcastStatus(userID, "online")

	for {
		var msg SocketMessage
		err := ws.ReadJSON(&msg)
		if err != nil {
			mu.Lock()
			delete(clients, userID)
			mu.Unlock()

			// 🔔 Broadcast: user ini sekarang OFFLINE
			broadcastStatus(userID, "offline")

			fmt.Printf("User terputus dari WebSocket: %s, Error: %v\n", userID, err)
			break
		}

		// Default type "message" kalau payload tidak menyertakan field type
		if msg.Type == "" {
			msg.Type = "message"
		}

		// 🔔 FITUR BARU: Typing Indicator (Tidak disimpan ke database)
		if msg.Type == "typing" {
			mu.Lock()
			receiverConn, online := clients[msg.ReceiverID]
			mu.Unlock()
			if online {
				_ = receiverConn.WriteJSON(msg)
			}
			continue
		}

		// LOG CHECK: Pastikan payload masuk dari frontend
		fmt.Printf("Menerima pesan dari %s ke %s: %s\n", msg.SenderID, msg.ReceiverID, msg.Text)

		// 1. Enkripsi isi pesan
		encText, nonce, err := encrypt(msg.Text)
		if err != nil {
			fmt.Println("Gagal enkripsi pesan:", err)
			continue
		}

		// 1.5 Parse UUID untuk database compatibility
		senderUUID, errS := uuid.Parse(msg.SenderID)
		receiverUUID, errR := uuid.Parse(msg.ReceiverID)
		if errS != nil || errR != nil {
			fmt.Printf("Gagal parse UUID: sender=%v, receiver=%v\n", errS, errR)
			continue
		}

		// 2. Simpan ke Database (Initial: is_read=false, is_delivered=cek_online)
		mu.Lock()
		_, online := clients[msg.ReceiverID]
		mu.Unlock()

		var insertedID string
		err = database.DB.QueryRow(r.Context(),
			`INSERT INTO messages (sender_id, receiver_id, encrypted_text, nonce, is_read, is_delivered) 
			 VALUES ($1, $2, $3, $4, false, $5) RETURNING id`,
			senderUUID, receiverUUID, encText, nonce, msg.IsDelivered,
		).Scan(&insertedID)

		if err != nil {
			fmt.Println("DATABASE_INSERT_ERROR:", err)

			// 🔔 Kirim error balik ke pengirim
			errMsg := SocketMessage{
				Type: "error",
				Text: "Gagal menyimpan pesan: " + err.Error(),
			}
			_ = ws.WriteJSON(errMsg)
			continue
		}

		msg.MessageID = insertedID
		// 3. Teruskan ke penerima jika penerima sedang online
		mu.Lock()
		receiverConn, online := clients[msg.ReceiverID]
		mu.Unlock()

		if online {
			err = receiverConn.WriteJSON(msg)
			if err != nil {
				fmt.Println("Gagal mengirim ke penerima via WS:", err)
			}
		} else {
			fmt.Printf("Penerima %s sedang offline, pesan disimpan di DB saja\n", msg.ReceiverID)
		}

		// 4. Kirim balik ke pengirim sebagai bentuk konfirmasi (Echo)
		err = ws.WriteJSON(msg)
		if err != nil {
			fmt.Println("Gagal mengirim balik konfirmasi ke pengirim via WS:", err)
		}

	}
}

// GetChatHistoryHandler mengambil riwayat pesan lama dan mendekripsinya untuk dibaca
func GetChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	fromUUID, errF := uuid.Parse(from)
	toUUID, errT := uuid.Parse(to)
	if errF != nil || errT != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid format 'from' or 'to' (must be UUID)"})
		return
	}

	rows, err := database.DB.Query(r.Context(),
		`SELECT id, sender_id, receiver_id, encrypted_text, nonce, created_at, is_read, is_delivered FROM messages 
		 WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
		 ORDER BY created_at ASC`, fromUUID, toUUID,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var history []map[string]interface{}
	for rows.Next() {
		var mID, sID, rID, encText, nonce string
		var isRead, isDelivered bool
		var createdAt time.Time
		if err := rows.Scan(&mID, &sID, &rID, &encText, &nonce, &createdAt, &isRead, &isDelivered); err != nil {
			fmt.Println("SCAN_HISTORY_ERROR:", err)
			continue
		}

		// Dekripsi pesan kembali ke plain text agar dikenali oleh frontend React
		decryptedText, err := decrypt(encText, nonce)
		if err != nil {
			decryptedText = "[Pesan gagal didekripsi secara aman]"
		}

		history = append(history, map[string]interface{}{
			"id":           mID,
			"sender_id":    sID,
			"receiver_id":  rID,
			"text":         decryptedText,
			"time":         createdAt.Format(time.RFC3339),
			"is_read":      isRead,
			"is_delivered": isDelivered,
		})
	}

	// Berikan proteksi fallback jika data historis masih kosong
	if history == nil {
		history = []map[string]interface{}{}
	}

	json.NewEncoder(w).Encode(history)
}

// MarkAsReadHandler menandai semua pesan dari "from" ke "to" sebagai sudah dibaca
// PATCH /messages/read?from=TARGET_ID&to=MY_ID
func MarkAsReadHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodPatch {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	from := r.URL.Query().Get("from") // lawan bicara (sender pesan yg mau ditandai dibaca)
	to := r.URL.Query().Get("to")     // user yang sedang login (penerima)

	if from == "" || to == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Parameter 'from' dan 'to' diperlukan"})
		return
	}

	fromUUID, errF := uuid.Parse(from)
	toUUID, errT := uuid.Parse(to)
	if errF != nil || errT != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid format 'from' or 'to' (must be UUID)"})
		return
	}

	_, err := database.DB.Exec(r.Context(),
		`UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
		fromUUID, toUUID,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Pesan ditandai sudah dibaca"})
}

// GetOnlineStatusHandler mengembalikan status online/offline satu user
// GET /user/online-status?user_id=UUID
func GetOnlineStatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Parameter 'user_id' diperlukan"})
		return
	}

	json.NewEncoder(w).Encode(map[string]bool{"is_online": IsUserOnline(userID)})
}
// DeleteMessageHandler menghapus satu pesan berdasarkan ID-nya
// DELETE /messages/delete?id=MESSAGE_ID&user_id=MY_ID&mode=me|everyone
func DeleteMessageHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodDelete {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	msgID := r.URL.Query().Get("id")
	userID := r.URL.Query().Get("user_id")
	mode := r.URL.Query().Get("mode") // "me" atau "everyone"

	if msgID == "" || userID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Parameter 'id' dan 'user_id' diperlukan"})
		return
	}

	// 1. Ambil info pesan sebelum dihapus (untuk broadcast jika mode everyone)
	var senderID, receiverID string
	err := database.DB.QueryRow(r.Context(), "SELECT sender_id, receiver_id FROM messages WHERE id = $1", msgID).Scan(&senderID, &receiverID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Pesan tidak ditemukan"})
		return
	}

	// 2. Eksekusi Hapus
	if mode == "everyone" {
		// Hapus permanen dari database
		_, err = database.DB.Exec(r.Context(), `DELETE FROM messages WHERE id = $1 AND sender_id = $2`, msgID, userID)
	} else {
		// Hapus untuk saya saja (bisa pakai tabel filter_deleted_messages atau semacamnya, 
		// tapi untuk MVP ini kita hapus permanen saja dari sudut pandang pengirim)
		_, err = database.DB.Exec(r.Context(), `DELETE FROM messages WHERE id = $1 AND sender_id = $2`, msgID, userID)
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// 3. Broadcast Deletion jika mode everyone
	if mode == "everyone" {
		mu.Lock()
		payload := SocketMessage{
			Type:       "delete",
			MessageID:  msgID,
			SenderID:   senderID,
			ReceiverID: receiverID,
		}
		// Kirim ke penerima
		if conn, ok := clients[receiverID]; ok {
			_ = conn.WriteJSON(payload)
		}
		// Kirim ke pengirim (untuk sync multi device jika ada)
		if conn, ok := clients[senderID]; ok {
			_ = conn.WriteJSON(payload)
		}
		mu.Unlock()
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Pesan berhasil dihapus"})
}

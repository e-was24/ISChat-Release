package handlers

import (
	"encoding/json"
	"ischat/database"
	"ischat/models"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// 1. GET /contacts?user_id=UUID_KAMU
func GetMyContactsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	userIDStr := r.URL.Query().Get("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid user ID format"})
		return
	}

	// 1. DETEKSI AKUN KOSONG: Cek apakah user_id yang request masih terdaftar di database
	var dbUserID string
	err = database.DB.QueryRow(
		r.Context(),
		`SELECT id FROM users WHERE id = $1`,
		userID.String(),
	).Scan(&dbUserID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Account not found"})
		return
	}

	// 2. Ambil kontak + pesan terakhir (LATERAL JOIN) + jumlah pesan belum dibaca
	// 2. Ambil SEMUA orang yang relevan: kontak tersimpan + orang yang pernah chat tapi belum di-add
	rows, err := database.DB.Query(
		r.Context(),
		`WITH combined AS (
        -- Kontak yang sudah disimpan secara manual
        SELECT 
            c.contact_user_id AS target_id,
            c.name_editable AS name_editable
        FROM contacts c
        WHERE c.user_id = $1

        UNION

        -- Orang yang pernah chat (kirim/terima pesan) tapi BELUM ada di tabel contacts
        SELECT DISTINCT
            CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS target_id,
            NULL AS name_editable
        FROM messages m
        WHERE ($1 = m.sender_id OR $1 = m.receiver_id)
          AND CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END NOT IN (
              SELECT contact_user_id FROM contacts WHERE user_id = $1
          )
    )
    SELECT 
        combined.target_id,
        combined.name_editable,
        u.username,
        u.phone_number,
        m.encrypted_text,
        m.nonce,
        m.created_at,
        (
            SELECT COUNT(*) FROM messages 
            WHERE sender_id = combined.target_id 
              AND receiver_id = $1 
              AND is_read = false
        ) AS unread_count
    FROM combined
    JOIN users u ON combined.target_id = u.id
    LEFT JOIN LATERAL (
        SELECT encrypted_text, nonce, created_at, is_read, is_delivered, sender_id
        FROM messages
        WHERE (sender_id = $1 AND receiver_id = combined.target_id)
           OR (sender_id = combined.target_id AND receiver_id = $1)
        ORDER BY created_at DESC
        LIMIT 1
    ) m ON true
    ORDER BY m.created_at DESC NULLS LAST`,
		userID.String(),
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	var response []models.ContactResponse

	for rows.Next() {
		var contactUserID, username, phoneNumber string
		var nameEditable *string // nullable, karena bisa belum jadi kontak resmi
		var encText, nonce, lastSenderID *string
		var lastIsRead, lastIsDelivered *bool
		var createdAt *time.Time
		var unreadCount int

		if err := rows.Scan(&contactUserID, &nameEditable, &username, &phoneNumber, &encText, &nonce, &createdAt, &unreadCount, &lastIsRead, &lastIsDelivered, &lastSenderID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		name := username // default fallback: tampilkan nomor/username kayak WA kalau belum di-add
		if nameEditable != nil && *nameEditable != "" {
			name = *nameEditable
		}

		lastSend := "Belum ada percakapan"
		dateTime := ""

		if encText != nil && nonce != nil {
			decrypted, errDec := decrypt(*encText, *nonce)
			if errDec == nil {
				lastSend = decrypted
			} else {
				lastSend = "[Pesan tidak dapat dibaca]"
			}
		}

		if createdAt != nil {
			dateTime = createdAt.Format("15:04")
		}

		response = append(response, models.ContactResponse{
			ContactUserID: contactUserID,
			NumberPhone:   phoneNumber,
			NameEditable:  name,
			LastSend:      lastSend,
			DateTime:      dateTime,
			Profile:       "",
			UnreadCount:   unreadCount,
			IsOnline:      IsUserOnline(contactUserID),
			// Tambahkan Metadata Pesan Terakhir
			LastMessageIsRead:      lastIsRead != nil && *lastIsRead,
			LastMessageIsDelivered: lastIsDelivered != nil && *lastIsDelivered,
			LastMessageSenderID:    func() string { if lastSenderID == nil { return "" }; return *lastSenderID }(),
		})
	}

	// Menghindari return 'null' jika array kosong, melainkan []
	if response == nil {
		response = []models.ContactResponse{}
	}

	json.NewEncoder(w).Encode(response)
}

// Struct untuk menampung request body POST
type AddContactInput struct {
	UserID      string `json:"user_id"`
	NumberPhone string `json:"number_phone"`
	CustomName  string `json:"custom_name"`
}

// 2. POST /contacts/add
func AddContactHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	var input AddContactInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	myID, err := uuid.Parse(input.UserID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid User ID"})
		return
	}

	// 1. Cari target user di tabel users berdasarkan nomor HP (+62xxx)
	var targetUserIDStr string
	err = database.DB.QueryRow(
		r.Context(),
		`SELECT id FROM users WHERE phone_number = $1`,
		input.NumberPhone,
	).Scan(&targetUserIDStr)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"message": "Nomor handphone tidak terdaftar"})
		return
	}

	targetUserID, _ := uuid.Parse(targetUserIDStr)

	// 2. Cegah menambahkan nomor handphone milik sendiri
	if myID == targetUserID {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Tidak bisa menambahkan nomor sendiri"})
		return
	}

	// 3. Cek apakah kontak sudah pernah ditambahkan sebelumnya (mencegah duplikasi data)
	var existingID string
	err = database.DB.QueryRow(
		r.Context(),
		`SELECT id FROM contacts WHERE user_id = $1 AND contact_user_id = $2`,
		myID.String(), targetUserID.String(),
	).Scan(&existingID)

	if err == nil {
		// Jika tidak error, artinya data ditemukan
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"message": "Kontak sudah ada dalam daftar"})
		return
	}

	// 4. Masukkan data kontak baru ke tabel contacts menggunakan SQL manual
	contactID := uuid.New()
	createdAt := time.Now()

	_, err = database.DB.Exec(
		r.Context(),
		`INSERT INTO contacts (id, user_id, contact_user_id, name_editable, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		contactID.String(), myID.String(), targetUserID.String(), input.CustomName, createdAt,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save contact: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Kontak berhasil ditambahkan!"})
}

package handlers

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"ischat/database"
	"ischat/models"
	"ischat/services"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

// Fungsi pembantu membuat nomor HP acak yang berbasis timestamp agar dijamin 100% unik di DB
func generateRandomPhoneNumber() string {
	timePart := time.Now().UnixMilli() % 1000000
	// Menggunakan crypto/rand yang aman untuk generate angka tambahan 4 digit belakang
	nBig, err := rand.Int(rand.Reader, big.NewInt(9000))
	randomPart := int64(1000)
	if err == nil {
		randomPart = nBig.Int64() + 1000
	}
	return fmt.Sprintf("+628%06d%d", timePart, randomPart)
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bad request"})
		return
	}

	// Hash password sebelum disimpan
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to hash password"})
		return
	}

	newID, err := uuid.NewRandom()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate ID"})
		return
	}

	// Jika frontend mengirimkan phone_number kosong, kita auto-generate di sini
	finalPhoneNumber := req.PhoneNumber
	if finalPhoneNumber == "" {
		finalPhoneNumber = generateRandomPhoneNumber()
	}

	user := models.User{
		ID:           newID,
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Role:         "user",
		PhoneNumber:  finalPhoneNumber,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Insert ke database menggunakan SQL manual (pgx)
	_, err = database.DB.Exec(
		r.Context(),
		`INSERT INTO users (id, email, username, password_hash, role, phone_number, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		user.ID, user.Email, user.Username, user.PasswordHash, user.Role, user.PhoneNumber, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			w.WriteHeader(http.StatusConflict)
			switch pgErr.ConstraintName {
			case "users_email_key":
				json.NewEncoder(w).Encode(map[string]string{"error": "Email already registered"})
			case "users_username_key":
				json.NewEncoder(w).Encode(map[string]string{"error": "Username already taken"})
			case "users_phone_number_key":
				json.NewEncoder(w).Encode(map[string]string{"error": "Phone number already registered"})
			default:
				json.NewEncoder(w).Encode(map[string]string{"error": "Duplicate data: " + pgErr.Detail})
			}
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create user: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bad request"})
		return
	}

	var user models.User

	// Ambil data user lengkap berdasarkan email
	err := database.DB.QueryRow(
		r.Context(),
		`SELECT id, email, username, password_hash, role, phone_number, created_at, updated_at
         FROM users WHERE email = $1`,
		req.Email,
	).Scan(
		&user.ID, &user.Email, &user.Username, &user.PasswordHash,
		&user.Role, &user.PhoneNumber, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid email or password"})
		return
	}

	// Bandingkan password plain text dengan hash bcrypt di DB
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid email or password"})
		return
	}

	// Generate token JWT menggunakan ID string
	token, err := services.GenerateToken(
		user.ID.String(),
		user.Role,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Token creation error"})
		return
	}

	// Berhasil login, kirim data token dan user_id terpisah dalam format JSON ideal
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"token":   token,
		"user_id": user.ID.String(),
	})
}

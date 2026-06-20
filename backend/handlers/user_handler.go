package handlers

import (
	"encoding/json"
	"net/http"

	"ischat/database"
)

// Struct untuk mengirim data ke frontend (perhatikan tag json-nya)
type ProfileResponse struct {
	Username    string `json:"username"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Bio         string `json:"bio"`
	ProfileUrl  string `json:"profile_picture_url"`
}

// Struct untuk menerima request update profil
type UpdateProfileRequest struct {
	UserID     string `json:"user_id"`
	Username   string `json:"username,omitempty"`
	Bio        string `json:"bio,omitempty"`
	ProfileUrl string `json:"profile_picture_url,omitempty"`
}

func GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	// Izinkan CORS (Sesuaikan jika kamu sudah mengatur CORS global di main.go)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "User ID wajib diisi"})
		return
	}

	var res ProfileResponse
	var bioNull, profileNull *string

	query := `SELECT username, email, phone_number, bio, profile_picture_url FROM users WHERE id = $1`
	err := database.DB.QueryRow(r.Context(), query, userID).Scan(&res.Username, &res.Email, &res.PhoneNumber, &bioNull, &profileNull)

	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User tidak ditemukan di database"})
		return
	}

	res.Bio = "Available"
	if bioNull != nil && *bioNull != "" {
		res.Bio = *bioNull
	}

	res.ProfileUrl = ""
	if profileNull != nil {
		res.ProfileUrl = *profileNull
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if req.Username != "" {
		_, err := database.DB.Exec(r.Context(), `UPDATE users SET username = $1 WHERE id = $2`, req.Username, req.UserID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	if req.Bio != "" {
		_, err := database.DB.Exec(r.Context(), `UPDATE users SET bio = $1 WHERE id = $2`, req.Bio, req.UserID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	if req.ProfileUrl != "" {
		_, err := database.DB.Exec(r.Context(), `UPDATE users SET profile_picture_url = $1 WHERE id = $2`, req.ProfileUrl, req.UserID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Profil berhasil diperbarui"})
}

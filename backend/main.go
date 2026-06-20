package main

import (
	"log"
	"net/http"

	"ischat/config"
	"ischat/database"
	"ischat/handlers"
)

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func main() {
	config.LoadEnv()
	database.ConnectDB()

	// Handler bawaan yang sudah kamu punya
	http.HandleFunc("/register", corsMiddleware(handlers.RegisterHandler))
	http.HandleFunc("/login", corsMiddleware(handlers.LoginHandler))

	// WebSocket TIDAK perlu corsMiddleware (upgrade request, beda mekanisme dari fetch CORS)
	http.HandleFunc("/ws", handlers.HandleConnections)

	// Semua route berbasis fetch() HARUS dibungkus corsMiddleware
	http.HandleFunc("/messages", corsMiddleware(handlers.GetChatHistoryHandler))
	http.HandleFunc("/messages/read", corsMiddleware(handlers.MarkAsReadHandler))
	http.HandleFunc("/messages/delete", corsMiddleware(handlers.DeleteMessageHandler))
	http.HandleFunc("/user/online-status", corsMiddleware(handlers.GetOnlineStatusHandler))

	http.HandleFunc("/contacts", corsMiddleware(handlers.GetMyContactsHandler))
	http.HandleFunc("/contacts/add", corsMiddleware(handlers.AddContactHandler))

	http.HandleFunc("/user/profile", corsMiddleware(handlers.GetProfileHandler))
	http.HandleFunc("/user/update", corsMiddleware(handlers.UpdateProfileHandler))

	port := config.GetEnv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server berjalan di :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("Peringatan: file .env tidak ditemukan, menggunakan variable lingkungan sistem.")
	}
}

func GetEnv(key string) string {
	return os.Getenv(key)
}

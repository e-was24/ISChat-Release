package database

import (
	"context"
	"log"

	"ischat/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Sekarang tipe data DB diubah menjadi *pgxpool.Pool
var DB *pgxpool.Pool

func ConnectDB() {
	// Gunakan pgxpool.New alih-alih pgx.Connect
	pool, err := pgxpool.New(
		context.Background(),
		config.GetEnv("DATABASE_URL"),
	)

	if err != nil {
		log.Fatalf("Gagal membuat database connection pool: %v", err)
	}

	DB = pool

	log.Println("Database connection pool successfully initialized!")
}

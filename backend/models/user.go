package models

import (
	"time"

	"github.com/google/uuid"
)

type Contact struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID        uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	ContactUserID uuid.UUID `gorm:"type:uuid;not null" json:"contact_user_id"`
	NameEditable  string    `gorm:"type:varchar(255)" json:"name_editable"`
	CreatedAt     time.Time `json:"created_at"`

	// Relasi ini otomatis mendeteksi struct User yang ada di contact.go
	ContactUser User `gorm:"foreignKey:ContactUserID;references:ID" json:"-"`
}

type ContactResponse struct {
	ContactUserID string `json:"contact_user_id"`
	NumberPhone   string `json:"NumberPhone"`
	NameEditable  string `json:"NameEditable"`
	LastSend      string `json:"LastSend"`
	DateTime      string `json:"DateTime"`
	Profile       string `json:"Profile"`
	UnreadCount   int    `json:"unread_count"`
	IsOnline      bool   `json:"is_online"`

	// Status Pesan Terakhir
	LastMessageIsRead      bool   `json:"last_message_is_read"`
	LastMessageIsDelivered bool   `json:"last_message_is_delivered"`
	LastMessageSenderID    string `json:"last_message_sender_id"`
}

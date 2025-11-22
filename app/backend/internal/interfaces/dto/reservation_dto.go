package dto

import (
	"github.com/google/uuid"
)

// CreateReservationRequestDTO represents the HTTP request for creating a reservation
type CreateReservationRequestDTO struct {
	SpaceID   uuid.UUID `json:"space_id" binding:"required"`
	UserID    string    `json:"user_id" binding:"required"`
	UserName  string    `json:"user_name"`
	Date      string    `json:"date" binding:"required"`      // Format: YYYY-MM-DD
	StartTime string    `json:"start_time,omitempty"`          // Format: HH:MM
	EndTime   string    `json:"end_time,omitempty"`           // Format: HH:MM
	Notes     string    `json:"notes"`
}

// UpdateReservationRequestDTO represents the HTTP request for updating a reservation
type UpdateReservationRequestDTO struct {
	UserName  string `json:"user_name"`
	Date      string `json:"date"`      // Format: YYYY-MM-DD
	StartTime string `json:"start_time"` // Format: HH:MM
	EndTime   string `json:"end_time"`   // Format: HH:MM
	Status    string `json:"status"`
	Notes     string `json:"notes"`
}

// ReservationResponseDTO represents the HTTP response for a reservation
type ReservationResponseDTO struct {
	ID        uuid.UUID `json:"id"`
	SpaceID   uuid.UUID `json:"space_id"`
	UserID    string    `json:"user_id"`
	UserName  string    `json:"user_name"`
	Date      string    `json:"date"` // Format: YYYY-MM-DD
	StartTime *string   `json:"start_time,omitempty"`
	EndTime   *string   `json:"end_time,omitempty"`
	Status    string    `json:"status"`
	Notes     string    `json:"notes"`
	CreatedAt string    `json:"created_at"`
	UpdatedAt string    `json:"updated_at"`
}


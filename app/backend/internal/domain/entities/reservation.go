package entities

import (
	"time"

	"github.com/google/uuid"
)

// ReservationStatus represents the status of a reservation
type ReservationStatus string

const (
	ReservationStatusActive    ReservationStatus = "active"
	ReservationStatusCancelled ReservationStatus = "cancelled"
)

// Reservation represents a booking for a space in the domain
type Reservation struct {
	ID        uuid.UUID
	SpaceID   uuid.UUID
	UserID    string
	UserName  string
	Date      time.Time
	StartTime *string
	EndTime   *string
	Status    ReservationStatus
	Notes     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// IsActive returns true if the reservation is active
func (r *Reservation) IsActive() bool {
	return r.Status == ReservationStatusActive
}

// IsCancelled returns true if the reservation is cancelled
func (r *Reservation) IsCancelled() bool {
	return r.Status == ReservationStatusCancelled
}

// Cancel marks the reservation as cancelled
func (r *Reservation) Cancel() {
	r.Status = ReservationStatusCancelled
	r.UpdatedAt = time.Now()
}


package repositories

import (
	"time"

	"github.com/google/uuid"
	"office-reservations/internal/domain/entities"
)

// ReservationRepository defines the interface for reservation data operations
type ReservationRepository interface {
	// FindByID finds a reservation by its ID
	FindByID(id uuid.UUID) (*entities.Reservation, error)
	
	// FindAll retrieves all reservations with optional filters
	FindAll(filters ReservationFilters) ([]*entities.Reservation, error)
	
	// Create creates a new reservation
	Create(reservation *entities.Reservation) error
	
	// Update updates an existing reservation
	Update(reservation *entities.Reservation) error
	
	// Delete deletes a reservation (soft delete by setting status to cancelled)
	Delete(id uuid.UUID) error
	
	// DeleteBySpaceAndTime deletes reservations for a specific space, date, and time
	DeleteBySpaceAndTime(spaceID uuid.UUID, date time.Time, startTime *string) error
	
	// DeleteBySpaceIDsAndTime deletes reservations for multiple spaces with same date and time
	DeleteBySpaceIDsAndTime(spaceIDs []uuid.UUID, date time.Time, startTime *string) error
	
	// FindBySpaceAndDate finds reservations for a specific space and date
	FindBySpaceAndDate(spaceID uuid.UUID, date time.Time) ([]*entities.Reservation, error)
	
	// FindBySpaceIDsAndDate finds reservations for multiple spaces and date
	FindBySpaceIDsAndDate(spaceIDs []uuid.UUID, date time.Time) ([]*entities.Reservation, error)
	
	// FindActiveBySpaceAndTime finds active reservations for a space, date, and time
	FindActiveBySpaceAndTime(spaceID uuid.UUID, date time.Time, startTime *string) (*entities.Reservation, error)
}

// ReservationFilters contains optional filters for querying reservations
type ReservationFilters struct {
	From    *time.Time
	To      *time.Time
	UserID  *string
	SpaceID *uuid.UUID
	Status  *entities.ReservationStatus
}


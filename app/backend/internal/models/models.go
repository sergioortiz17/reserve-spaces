package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// OfficeMap represents the office layout configuration
type OfficeMap struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Name        string         `json:"name" gorm:"not null"`
	Description string         `json:"description"`
	JSONData    datatypes.JSON `json:"json_data" gorm:"type:jsonb;not null"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	Spaces      []Space        `json:"spaces,omitempty" gorm:"foreignKey:MapID"`
}

// Space represents an individual space in the office
type Space struct {
	ID           uuid.UUID     `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	MapID        uuid.UUID     `json:"map_id" gorm:"type:uuid;not null"`
	Name         string        `json:"name" gorm:"not null"`
	Type         string        `json:"type" gorm:"not null;check:type IN ('workstation', 'meeting_room', 'cubicle')"`
	X            int           `json:"x" gorm:"not null"`
	Y            int           `json:"y" gorm:"not null"`
	Width        int           `json:"width" gorm:"default:1"`
	Height       int           `json:"height" gorm:"default:1"`
	Capacity     int           `json:"capacity" gorm:"default:1"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
	Map          OfficeMap     `json:"map,omitempty" gorm:"foreignKey:MapID"`
	Reservations []Reservation `json:"reservations,omitempty" gorm:"foreignKey:SpaceID"`
}

// Reservation represents a booking for a space
type Reservation struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	SpaceID   uuid.UUID  `json:"space_id" gorm:"type:uuid;not null"`
	UserID    string     `json:"user_id" gorm:"not null"`
	UserName  string     `json:"user_name"`
	Date      time.Time  `json:"date" gorm:"type:date;not null"`
	StartTime *time.Time `json:"start_time,omitempty" gorm:"type:time"`
	EndTime   *time.Time `json:"end_time,omitempty" gorm:"type:time"`
	Status    string     `json:"status" gorm:"default:'active';check:status IN ('active', 'cancelled')"`
	Notes     string     `json:"notes"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	Space     Space      `json:"space,omitempty" gorm:"foreignKey:SpaceID"`
}

// CreateReservationRequest represents the request payload for creating a reservation
type CreateReservationRequest struct {
	SpaceID   uuid.UUID `json:"space_id" binding:"required"`
	UserID    string    `json:"user_id" binding:"required"`
	UserName  string    `json:"user_name"`
	Date      string    `json:"date" binding:"required"` // Format: YYYY-MM-DD
	StartTime string    `json:"start_time,omitempty"`    // Format: HH:MM
	EndTime   string    `json:"end_time,omitempty"`      // Format: HH:MM
	Notes     string    `json:"notes"`
}

// UpdateReservationRequest represents the request payload for updating a reservation
type UpdateReservationRequest struct {
	UserName  string `json:"user_name"`
	Date      string `json:"date"`      // Format: YYYY-MM-DD
	StartTime string `json:"start_time"` // Format: HH:MM
	EndTime   string `json:"end_time"`   // Format: HH:MM
	Status    string `json:"status"`
	Notes     string `json:"notes"`
}

// CreateMapRequest represents the request payload for creating a map
type CreateMapRequest struct {
	Name        string      `json:"name" binding:"required"`
	Description string      `json:"description"`
	JSONData    interface{} `json:"json_data" binding:"required"`
}

// UpdateMapRequest represents the request payload for updating a map
type UpdateMapRequest struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	JSONData    interface{} `json:"json_data"`
}

// CreateSpaceRequest represents the request payload for creating a space
type CreateSpaceRequest struct {
	MapID    uuid.UUID `json:"map_id" binding:"required"`
	Name     string    `json:"name" binding:"required"`
	Type     string    `json:"type" binding:"required,oneof=workstation meeting_room cubicle"`
	X        int       `json:"x" binding:"required"`
	Y        int       `json:"y" binding:"required"`
	Width    int       `json:"width"`
	Height   int       `json:"height"`
	Capacity int       `json:"capacity"`
}

// UpdateSpaceRequest represents the request payload for updating a space
type UpdateSpaceRequest struct {
	Name     string `json:"name"`
	Type     string `json:"type" binding:"omitempty,oneof=workstation meeting_room cubicle"`
	X        *int   `json:"x"`
	Y        *int   `json:"y"`
	Width    *int   `json:"width"`
	Height   *int   `json:"height"`
	Capacity *int   `json:"capacity"`
}

// AvailabilityResponse represents space availability for a specific date
type AvailabilityResponse struct {
	SpaceID     uuid.UUID `json:"space_id"`
	Date        string    `json:"date"`
	IsAvailable bool      `json:"is_available"`
	Reservations []Reservation `json:"reservations,omitempty"`
}

// BeforeCreate hook for generating UUIDs
func (m *OfficeMap) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}

func (s *Space) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (r *Reservation) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}
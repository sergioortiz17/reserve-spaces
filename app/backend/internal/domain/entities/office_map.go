package entities

import (
	"time"

	"github.com/google/uuid"
)

// OfficeMap represents the office layout configuration in the domain
type OfficeMap struct {
	ID          uuid.UUID
	Name        string
	Description string
	JSONData    map[string]interface{}
	CreatedAt   time.Time
	UpdatedAt   time.Time
}


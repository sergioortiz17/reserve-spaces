package repositories

import (
	"github.com/google/uuid"
	"office-reservations/internal/domain/entities"
)

// OfficeMapRepository defines the interface for office map data operations
type OfficeMapRepository interface {
	// FindByID finds a map by its ID
	FindByID(id uuid.UUID) (*entities.OfficeMap, error)
	
	// FindAll retrieves all maps
	FindAll() ([]*entities.OfficeMap, error)
	
	// Create creates a new map
	Create(m *entities.OfficeMap) error
	
	// Update updates an existing map
	Update(m *entities.OfficeMap) error
	
	// Delete deletes a map
	Delete(id uuid.UUID) error
}


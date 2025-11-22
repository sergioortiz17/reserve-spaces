package repositories

import (
	"github.com/google/uuid"
	"office-reservations/internal/domain/entities"
)

// SpaceRepository defines the interface for space data operations
type SpaceRepository interface {
	// FindByID finds a space by its ID
	FindByID(id uuid.UUID) (*entities.Space, error)
	
	// FindByMapID finds all spaces for a specific map
	FindByMapID(mapID uuid.UUID) ([]*entities.Space, error)
	
	// FindByTypeAndMapID finds spaces by type and map ID
	FindByTypeAndMapID(spaceType entities.SpaceType, mapID uuid.UUID) ([]*entities.Space, error)
	
	// FindMeetingRoomsByBaseName finds meeting room spaces with the same base name
	FindMeetingRoomsByBaseName(baseName string, mapID uuid.UUID) ([]*entities.Space, error)
	
	// Create creates a new space
	Create(space *entities.Space) error
	
	// Update updates an existing space
	Update(space *entities.Space) error
	
	// Delete deletes a space
	Delete(id uuid.UUID) error
}


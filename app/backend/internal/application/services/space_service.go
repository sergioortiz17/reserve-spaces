package services

import (
	"github.com/google/uuid"
	"office-reservations/internal/domain/entities"
	"office-reservations/internal/domain/repositories"
)

// SpaceService handles space business logic
type SpaceService struct {
	spaceRepo repositories.SpaceRepository
}

// NewSpaceService creates a new space service
func NewSpaceService(spaceRepo repositories.SpaceRepository) *SpaceService {
	return &SpaceService{
		spaceRepo: spaceRepo,
	}
}

// GetSpace retrieves a space by ID
func (s *SpaceService) GetSpace(id uuid.UUID) (*entities.Space, error) {
	space, err := s.spaceRepo.FindByID(id)
	if err != nil {
		return nil, ErrSpaceNotFound
	}
	return space, nil
}

// GetSpacesByMapID retrieves all spaces for a map
func (s *SpaceService) GetSpacesByMapID(mapID uuid.UUID) ([]*entities.Space, error) {
	return s.spaceRepo.FindByMapID(mapID)
}

// GetMeetingRoomsByBaseName finds meeting room spaces with the same base name
func (s *SpaceService) GetMeetingRoomsByBaseName(baseName string, mapID uuid.UUID) ([]*entities.Space, error) {
	return s.spaceRepo.FindMeetingRoomsByBaseName(baseName, mapID)
}


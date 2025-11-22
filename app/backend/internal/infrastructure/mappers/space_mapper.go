package mappers

import (
	"office-reservations/internal/domain/entities"
	"office-reservations/internal/models"
)

// ToDomainSpace converts a database model to a domain entity
func ToDomainSpace(m *models.Space) *entities.Space {
	if m == nil {
		return nil
	}
	return &entities.Space{
		ID:        m.ID,
		MapID:     m.MapID,
		Name:      m.Name,
		Type:      entities.SpaceType(m.Type),
		X:         m.X,
		Y:         m.Y,
		Width:     m.Width,
		Height:    m.Height,
		Capacity:  m.Capacity,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

// ToDomainSpaces converts a slice of database models to domain entities
func ToDomainSpaces(models []models.Space) []*entities.Space {
	result := make([]*entities.Space, len(models))
	for i := range models {
		result[i] = ToDomainSpace(&models[i])
	}
	return result
}

// ToModelSpace converts a domain entity to a database model
func ToModelSpace(e *entities.Space) *models.Space {
	if e == nil {
		return nil
	}
	return &models.Space{
		ID:        e.ID,
		MapID:     e.MapID,
		Name:      e.Name,
		Type:      string(e.Type),
		X:         e.X,
		Y:         e.Y,
		Width:     e.Width,
		Height:    e.Height,
		Capacity:  e.Capacity,
		CreatedAt: e.CreatedAt,
		UpdatedAt: e.UpdatedAt,
	}
}


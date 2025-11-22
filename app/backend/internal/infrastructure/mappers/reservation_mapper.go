package mappers

import (
	"office-reservations/internal/domain/entities"
	"office-reservations/internal/models"
)

// ToDomainReservation converts a database model to a domain entity
func ToDomainReservation(m *models.Reservation) *entities.Reservation {
	if m == nil {
		return nil
	}
	return &entities.Reservation{
		ID:        m.ID,
		SpaceID:   m.SpaceID,
		UserID:    m.UserID,
		UserName:  m.UserName,
		Date:      m.Date,
		StartTime: m.StartTime,
		EndTime:   m.EndTime,
		Status:    entities.ReservationStatus(m.Status),
		Notes:     m.Notes,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

// ToDomainReservations converts a slice of database models to domain entities
func ToDomainReservations(models []models.Reservation) []*entities.Reservation {
	result := make([]*entities.Reservation, len(models))
	for i := range models {
		result[i] = ToDomainReservation(&models[i])
	}
	return result
}

// ToModelReservation converts a domain entity to a database model
func ToModelReservation(e *entities.Reservation) *models.Reservation {
	if e == nil {
		return nil
	}
	return &models.Reservation{
		ID:        e.ID,
		SpaceID:   e.SpaceID,
		UserID:    e.UserID,
		UserName:  e.UserName,
		Date:      e.Date,
		StartTime: e.StartTime,
		EndTime:   e.EndTime,
		Status:    string(e.Status),
		Notes:     e.Notes,
		CreatedAt: e.CreatedAt,
		UpdatedAt: e.UpdatedAt,
	}
}


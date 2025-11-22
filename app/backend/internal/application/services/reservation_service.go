package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"office-reservations/internal/domain/entities"
	"office-reservations/internal/domain/repositories"
)

var (
	ErrReservationNotFound      = errors.New("reservation not found")
	ErrSpaceNotFound            = errors.New("space not found")
	ErrInvalidDate              = errors.New("invalid date")
	ErrInvalidTime              = errors.New("invalid time")
	ErrDateInPast               = errors.New("cannot reserve dates in the past")
	ErrDateTooFarInFuture       = errors.New("cannot reserve more than 1 week in advance")
	ErrStartTimeAfterEndTime    = errors.New("start time must be before end time")
	ErrReservationAlreadyExists = errors.New("space is already reserved for this time slot")
	ErrCannotUpdateCancelled    = errors.New("cannot update cancelled reservation")
)

// ReservationService handles reservation business logic
type ReservationService struct {
	reservationRepo repositories.ReservationRepository
	spaceRepo       repositories.SpaceRepository
}

// NewReservationService creates a new reservation service
func NewReservationService(
	reservationRepo repositories.ReservationRepository,
	spaceRepo repositories.SpaceRepository,
) *ReservationService {
	return &ReservationService{
		reservationRepo: reservationRepo,
		spaceRepo:       spaceRepo,
	}
}

// CreateReservationRequest represents the input for creating a reservation
type CreateReservationRequest struct {
	SpaceID   uuid.UUID
	UserID    string
	UserName  string
	Date      time.Time
	StartTime *string
	EndTime   *string
	Notes     string
}

// CreateReservation creates a new reservation with business logic validation
func (s *ReservationService) CreateReservation(req CreateReservationRequest) (*entities.Reservation, error) {
	// Validate date
	now := time.Now()
	maxDate := now.AddDate(0, 0, 7)
	if req.Date.After(maxDate) {
		return nil, ErrDateTooFarInFuture
	}
	if req.Date.Before(now.Truncate(24 * time.Hour)) {
		return nil, ErrDateInPast
	}

	// Verify space exists
	space, err := s.spaceRepo.FindByID(req.SpaceID)
	if err != nil {
		return nil, ErrSpaceNotFound
	}

	// Validate time format and range
	if req.StartTime != nil {
		if _, err := time.Parse("15:04", *req.StartTime); err != nil {
			return nil, ErrInvalidTime
		}
	}
	if req.EndTime != nil {
		if _, err := time.Parse("15:04", *req.EndTime); err != nil {
			return nil, ErrInvalidTime
		}
	}
	if req.StartTime != nil && req.EndTime != nil {
		start, _ := time.Parse("15:04", *req.StartTime)
		end, _ := time.Parse("15:04", *req.EndTime)
		if !start.Before(end) {
			return nil, ErrStartTimeAfterEndTime
		}
	}

	// Delete existing reservations for this space/date/time (overwrite behavior)
	if err := s.deleteExistingReservations(space, req.Date, req.StartTime); err != nil {
		return nil, err
	}

	// Create new reservation
	reservation := &entities.Reservation{
		ID:        uuid.New(),
		SpaceID:   req.SpaceID,
		UserID:    req.UserID,
		UserName:  req.UserName,
		Date:      req.Date,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		Status:    entities.ReservationStatusActive,
		Notes:     req.Notes,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.reservationRepo.Create(reservation); err != nil {
		return nil, err
	}

	return reservation, nil
}

// deleteExistingReservations deletes existing reservations for overwrite behavior
func (s *ReservationService) deleteExistingReservations(space *entities.Space, date time.Time, startTime *string) error {
	if space.IsMeetingRoom() {
		// For meeting rooms, find all spaces in the group
		baseName := space.GetBaseName()
		groupSpaces, err := s.spaceRepo.FindMeetingRoomsByBaseName(baseName, space.MapID)
		if err != nil {
			return err
		}

		if len(groupSpaces) > 0 {
			spaceIDs := make([]uuid.UUID, len(groupSpaces))
			for i, s := range groupSpaces {
				spaceIDs[i] = s.ID
			}
			return s.reservationRepo.DeleteBySpaceIDsAndTime(spaceIDs, date, startTime)
		}
	}

	// For non-meeting rooms, delete for single space
	return s.reservationRepo.DeleteBySpaceAndTime(space.ID, date, startTime)
}

// UpdateReservationRequest represents the input for updating a reservation
type UpdateReservationRequest struct {
	ID        uuid.UUID
	UserName  *string
	Date      *time.Time
	StartTime *string
	EndTime   *string
	Status    *entities.ReservationStatus
	Notes     *string
}

// UpdateReservation updates an existing reservation
func (s *ReservationService) UpdateReservation(req UpdateReservationRequest) (*entities.Reservation, error) {
	reservation, err := s.reservationRepo.FindByID(req.ID)
	if err != nil {
		return nil, ErrReservationNotFound
	}

	if reservation.IsCancelled() {
		return nil, ErrCannotUpdateCancelled
	}

	// Update fields if provided
	if req.UserName != nil {
		reservation.UserName = *req.UserName
	}
	if req.Date != nil {
		reservation.Date = *req.Date
	}
	if req.StartTime != nil {
		if _, err := time.Parse("15:04", *req.StartTime); err != nil {
			return nil, ErrInvalidTime
		}
		reservation.StartTime = req.StartTime
	}
	if req.EndTime != nil {
		if _, err := time.Parse("15:04", *req.EndTime); err != nil {
			return nil, ErrInvalidTime
		}
		reservation.EndTime = req.EndTime
	}
	if req.Status != nil {
		reservation.Status = *req.Status
	}
	if req.Notes != nil {
		reservation.Notes = *req.Notes
	}

	reservation.UpdatedAt = time.Now()

	if err := s.reservationRepo.Update(reservation); err != nil {
		return nil, err
	}

	return reservation, nil
}

// DeleteReservation deletes (cancels) a reservation
func (s *ReservationService) DeleteReservation(id uuid.UUID) error {
	reservation, err := s.reservationRepo.FindByID(id)
	if err != nil {
		return ErrReservationNotFound
	}

	// Get the space to check if it's a meeting room
	space, err := s.spaceRepo.FindByID(reservation.SpaceID)
	if err != nil {
		return ErrSpaceNotFound
	}

	// If it's a meeting room, delete all related group reservations
	if space.IsMeetingRoom() {
		baseName := space.GetBaseName()
		groupSpaces, err := s.spaceRepo.FindMeetingRoomsByBaseName(baseName, space.MapID)
		if err != nil {
			return err
		}

		if len(groupSpaces) > 0 {
			spaceIDs := make([]uuid.UUID, len(groupSpaces))
			for i, s := range groupSpaces {
				spaceIDs[i] = s.ID
			}

			// Delete all active reservations for these spaces with same user, date, and time
			reservations, err := s.reservationRepo.FindBySpaceIDsAndDate(spaceIDs, reservation.Date)
			if err != nil {
				return err
			}

			for _, r := range reservations {
				if r.UserName == reservation.UserName &&
					r.Status == entities.ReservationStatusActive &&
					timeMatches(r.StartTime, reservation.StartTime) &&
					timeMatches(r.EndTime, reservation.EndTime) {
					if err := s.reservationRepo.Delete(r.ID); err != nil {
						return err
					}
				}
			}
			return nil
		}
	}

	// For non-meeting rooms, delete single reservation
	return s.reservationRepo.Delete(id)
}

// timeMatches checks if two time strings match (handles HH:MM and HH:MM:SS formats)
func timeMatches(t1, t2 *string) bool {
	if t1 == nil && t2 == nil {
		return true
	}
	if t1 == nil || t2 == nil {
		return false
	}
	// Normalize to HH:MM for comparison
	normalize := func(t string) string {
		if len(t) > 5 {
			return t[:5]
		}
		return t
	}
	return normalize(*t1) == normalize(*t2)
}

// GetReservations retrieves reservations with optional filters
func (s *ReservationService) GetReservations(filters repositories.ReservationFilters) ([]*entities.Reservation, error) {
	return s.reservationRepo.FindAll(filters)
}

// GetReservation retrieves a single reservation by ID
func (s *ReservationService) GetReservation(id uuid.UUID) (*entities.Reservation, error) {
	return s.reservationRepo.FindByID(id)
}


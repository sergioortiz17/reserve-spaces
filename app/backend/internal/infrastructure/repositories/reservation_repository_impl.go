package repositories

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"office-reservations/internal/domain/entities"
	domainRepos "office-reservations/internal/domain/repositories"
	"office-reservations/internal/infrastructure/mappers"
	"office-reservations/internal/models"
)

// reservationRepository implements ReservationRepository interface
type reservationRepository struct {
	db *gorm.DB
}

// NewReservationRepository creates a new reservation repository
func NewReservationRepository(db *gorm.DB) domainRepos.ReservationRepository {
	return &reservationRepository{db: db}
}

func (r *reservationRepository) FindByID(id uuid.UUID) (*entities.Reservation, error) {
	var model models.Reservation
	if err := r.db.Preload("Space").First(&model, id).Error; err != nil {
		return nil, err
	}
	return mappers.ToDomainReservation(&model), nil
}

func (r *reservationRepository) FindAll(filters domainRepos.ReservationFilters) ([]*entities.Reservation, error) {
	query := r.db.Model(&models.Reservation{}).Preload("Space")

	if filters.From != nil {
		query = query.Where("date >= ?", *filters.From)
	}
	if filters.To != nil {
		query = query.Where("date <= ?", *filters.To)
	}
	if filters.UserID != nil {
		query = query.Where("user_id = ?", *filters.UserID)
	}
	if filters.SpaceID != nil {
		query = query.Where("space_id = ?", *filters.SpaceID)
	}
	if filters.Status != nil {
		query = query.Where("status = ?", string(*filters.Status))
	}

	var models []models.Reservation
	if err := query.Order("date ASC, start_time ASC").Find(&models).Error; err != nil {
		return nil, err
	}

	return mappers.ToDomainReservations(models), nil
}

func (r *reservationRepository) Create(reservation *entities.Reservation) error {
	model := mappers.ToModelReservation(reservation)
	return r.db.Create(model).Error
}

func (r *reservationRepository) Update(reservation *entities.Reservation) error {
	model := mappers.ToModelReservation(reservation)
	return r.db.Save(model).Error
}

func (r *reservationRepository) Delete(id uuid.UUID) error {
	return r.db.Model(&models.Reservation{}).
		Where("id = ?", id).
		Update("status", string(entities.ReservationStatusCancelled)).Error
}

func (r *reservationRepository) DeleteBySpaceAndTime(spaceID uuid.UUID, date time.Time, startTime *string) error {
	query := r.db.Model(&models.Reservation{}).
		Where("space_id = ? AND date = ?", spaceID, date)

	if startTime != nil {
		normalizedTime := *startTime
		if len(normalizedTime) > 5 {
			normalizedTime = normalizedTime[:5]
		}
		query = query.Where("(start_time = ? OR start_time = ? OR start_time::text LIKE ?)",
			startTime, normalizedTime, normalizedTime+":%")
	} else {
		query = query.Where("start_time IS NULL")
	}

	return query.Delete(&models.Reservation{}).Error
}

func (r *reservationRepository) DeleteBySpaceIDsAndTime(spaceIDs []uuid.UUID, date time.Time, startTime *string) error {
	query := r.db.Model(&models.Reservation{}).
		Where("space_id IN ? AND date = ?", spaceIDs, date)

	if startTime != nil {
		normalizedTime := *startTime
		if len(normalizedTime) > 5 {
			normalizedTime = normalizedTime[:5]
		}
		query = query.Where("(start_time = ? OR start_time = ? OR start_time::text LIKE ?)",
			startTime, normalizedTime, normalizedTime+":%")
	} else {
		query = query.Where("start_time IS NULL")
	}

	return query.Delete(&models.Reservation{}).Error
}

func (r *reservationRepository) FindBySpaceAndDate(spaceID uuid.UUID, date time.Time) ([]*entities.Reservation, error) {
	var models []models.Reservation
	if err := r.db.Where("space_id = ? AND date = ?", spaceID, date).
		Find(&models).Error; err != nil {
		return nil, err
	}
	return mappers.ToDomainReservations(models), nil
}

func (r *reservationRepository) FindBySpaceIDsAndDate(spaceIDs []uuid.UUID, date time.Time) ([]*entities.Reservation, error) {
	var models []models.Reservation
	if err := r.db.Where("space_id IN ? AND date = ?", spaceIDs, date).
		Find(&models).Error; err != nil {
		return nil, err
	}
	return mappers.ToDomainReservations(models), nil
}

func (r *reservationRepository) FindActiveBySpaceAndTime(spaceID uuid.UUID, date time.Time, startTime *string) (*entities.Reservation, error) {
	query := r.db.Model(&models.Reservation{}).
		Where("space_id = ? AND date = ? AND status = ?", spaceID, date, string(entities.ReservationStatusActive))

	if startTime != nil {
		normalizedTime := *startTime
		if len(normalizedTime) > 5 {
			normalizedTime = normalizedTime[:5]
		}
		query = query.Where("(start_time = ? OR start_time = ? OR start_time::text LIKE ?)",
			startTime, normalizedTime, normalizedTime+":%")
	} else {
		query = query.Where("start_time IS NULL")
	}

	var model models.Reservation
	if err := query.First(&model).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return mappers.ToDomainReservation(&model), nil
}


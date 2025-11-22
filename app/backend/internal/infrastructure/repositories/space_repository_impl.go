package repositories

import (
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"office-reservations/internal/domain/entities"
	domainRepos "office-reservations/internal/domain/repositories"
	"office-reservations/internal/infrastructure/mappers"
	"office-reservations/internal/models"
)

// spaceRepository implements SpaceRepository interface
type spaceRepository struct {
	db *gorm.DB
}

// NewSpaceRepository creates a new space repository
func NewSpaceRepository(db *gorm.DB) domainRepos.SpaceRepository {
	return &spaceRepository{db: db}
}

func (r *spaceRepository) FindByID(id uuid.UUID) (*entities.Space, error) {
	var model models.Space
	if err := r.db.First(&model, id).Error; err != nil {
		return nil, err
	}
	return mappers.ToDomainSpace(&model), nil
}

func (r *spaceRepository) FindByMapID(mapID uuid.UUID) ([]*entities.Space, error) {
	var models []models.Space
	if err := r.db.Where("map_id = ?", mapID).Find(&models).Error; err != nil {
		return nil, err
	}
	return mappers.ToDomainSpaces(models), nil
}

func (r *spaceRepository) FindByTypeAndMapID(spaceType entities.SpaceType, mapID uuid.UUID) ([]*entities.Space, error) {
	var models []models.Space
	if err := r.db.Where("type = ? AND map_id = ?", string(spaceType), mapID).
		Find(&models).Error; err != nil {
		return nil, err
	}
	return mappers.ToDomainSpaces(models), nil
}

func (r *spaceRepository) FindMeetingRoomsByBaseName(baseName string, mapID uuid.UUID) ([]*entities.Space, error) {
	// Find all meeting rooms for this map
	allMeetingRooms, err := r.FindByTypeAndMapID(entities.SpaceTypeMeetingRoom, mapID)
	if err != nil {
		return nil, err
	}

	// Filter by base name
	var matching []*entities.Space
	baseNameLower := strings.ToLower(strings.TrimSpace(baseName))
	for _, space := range allMeetingRooms {
		if strings.ToLower(strings.TrimSpace(space.GetBaseName())) == baseNameLower {
			matching = append(matching, space)
		}
	}

	return matching, nil
}

func (r *spaceRepository) Create(space *entities.Space) error {
	model := mappers.ToModelSpace(space)
	return r.db.Create(model).Error
}

func (r *spaceRepository) Update(space *entities.Space) error {
	model := mappers.ToModelSpace(space)
	return r.db.Save(model).Error
}

func (r *spaceRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Space{}, id).Error
}


package di

import (
	"gorm.io/gorm"
	"office-reservations/internal/application/services"
	domainRepos "office-reservations/internal/domain/repositories"
	infraRepos "office-reservations/internal/infrastructure/repositories"
	"office-reservations/internal/interfaces/http"
)

// Container holds all dependencies
type Container struct {
	// Repositories
	ReservationRepo domainRepos.ReservationRepository
	SpaceRepo       domainRepos.SpaceRepository

	// Services
	ReservationService *services.ReservationService
	SpaceService       *services.SpaceService

	// Handlers
	ReservationHandler *http.ReservationHandler
}

// NewContainer creates a new dependency injection container
func NewContainer(db *gorm.DB) *Container {
	// Initialize repositories
	reservationRepo := infraRepos.NewReservationRepository(db)
	spaceRepo := infraRepos.NewSpaceRepository(db)

	// Initialize services
	reservationService := services.NewReservationService(reservationRepo, spaceRepo)
	spaceService := services.NewSpaceService(spaceRepo)

	// Initialize handlers
	reservationHandler := http.NewReservationHandler(reservationService)

	return &Container{
		ReservationRepo:   reservationRepo,
		SpaceRepo:         spaceRepo,
		ReservationService: reservationService,
		SpaceService:       spaceService,
		ReservationHandler: reservationHandler,
	}
}


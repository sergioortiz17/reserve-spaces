package http

import (
	"net/http"
	"office-reservations/internal/application/services"
	"office-reservations/internal/domain/entities"
	"office-reservations/internal/domain/repositories"
	"office-reservations/internal/interfaces/dto"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ReservationHandler handles HTTP requests for reservations
type ReservationHandler struct {
	reservationService *services.ReservationService
}

// NewReservationHandler creates a new reservation handler
func NewReservationHandler(reservationService *services.ReservationService) *ReservationHandler {
	return &ReservationHandler{
		reservationService: reservationService,
	}
}

// GetReservations handles GET /api/reservations
func (h *ReservationHandler) GetReservations(c *gin.Context) {
	filters := repositories.ReservationFilters{}

	// Parse query parameters
	if from := c.Query("from"); from != "" {
		if fromDate, err := time.Parse("2006-01-02", from); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'from' date format (use YYYY-MM-DD)"})
			return
		} else {
			filters.From = &fromDate
		}
	}

	if to := c.Query("to"); to != "" {
		if toDate, err := time.Parse("2006-01-02", to); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'to' date format (use YYYY-MM-DD)"})
			return
		} else {
			filters.To = &toDate
		}
	}

	if userID := c.Query("user_id"); userID != "" {
		filters.UserID = &userID
	}

	if spaceID := c.Query("space_id"); spaceID != "" {
		if id, err := uuid.Parse(spaceID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid space ID"})
			return
		} else {
			filters.SpaceID = &id
		}
	}

	// Only active reservations by default
	activeStatus := entities.ReservationStatusActive
	filters.Status = &activeStatus

	reservations, err := h.reservationService.GetReservations(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservations"})
		return
	}

	// Convert to response DTOs
	response := make([]dto.ReservationResponseDTO, len(reservations))
	for i, r := range reservations {
		response[i] = toReservationResponseDTO(r)
	}

	c.JSON(http.StatusOK, response)
}

// GetReservation handles GET /api/reservations/:id
func (h *ReservationHandler) GetReservation(c *gin.Context) {
	id := c.Param("id")
	reservationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	reservation, err := h.reservationService.GetReservation(reservationID)
	if err != nil {
		if err == services.ErrReservationNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservation"})
		return
	}

	c.JSON(http.StatusOK, toReservationResponseDTO(reservation))
}

// CreateReservation handles POST /api/reservations
func (h *ReservationHandler) CreateReservation(c *gin.Context) {
	var req dto.CreateReservationRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (use YYYY-MM-DD)"})
		return
	}

	// Build service request
	serviceReq := services.CreateReservationRequest{
		SpaceID:   req.SpaceID,
		UserID:    req.UserID,
		UserName:  req.UserName,
		Date:      date,
		StartTime: nil,
		EndTime:   nil,
		Notes:     req.Notes,
	}

	if req.StartTime != "" {
		serviceReq.StartTime = &req.StartTime
	}
	if req.EndTime != "" {
		serviceReq.EndTime = &req.EndTime
	}

	// Create reservation
	reservation, err := h.reservationService.CreateReservation(serviceReq)
	if err != nil {
		switch err {
		case services.ErrSpaceNotFound:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Space not found"})
		case services.ErrDateInPast:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot reserve dates in the past"})
		case services.ErrDateTooFarInFuture:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot reserve more than 1 week in advance"})
		case services.ErrInvalidTime:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time format (use HH:MM)"})
		case services.ErrStartTimeAfterEndTime:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Start time must be before end time"})
		case services.ErrReservationAlreadyExists:
			c.JSON(http.StatusConflict, gin.H{"error": "Space is already reserved for this time slot"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reservation"})
		}
		return
	}

	c.JSON(http.StatusCreated, toReservationResponseDTO(reservation))
}

// UpdateReservation handles PUT /api/reservations/:id
func (h *ReservationHandler) UpdateReservation(c *gin.Context) {
	id := c.Param("id")
	reservationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	var req dto.UpdateReservationRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build service request
	serviceReq := services.UpdateReservationRequest{
		ID: reservationID,
	}

	if req.UserName != "" {
		serviceReq.UserName = &req.UserName
	}
	if req.Date != "" {
		if date, err := time.Parse("2006-01-02", req.Date); err == nil {
			serviceReq.Date = &date
		}
	}
	if req.StartTime != "" {
		serviceReq.StartTime = &req.StartTime
	}
	if req.EndTime != "" {
		serviceReq.EndTime = &req.EndTime
	}
	if req.Status != "" {
		status := entities.ReservationStatus(req.Status)
		serviceReq.Status = &status
	}
	if req.Notes != "" {
		serviceReq.Notes = &req.Notes
	}

	// Update reservation
	reservation, err := h.reservationService.UpdateReservation(serviceReq)
	if err != nil {
		switch err {
		case services.ErrReservationNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		case services.ErrCannotUpdateCancelled:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot update cancelled reservation"})
		case services.ErrInvalidTime:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time format (use HH:MM)"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reservation"})
		}
		return
	}

	c.JSON(http.StatusOK, toReservationResponseDTO(reservation))
}

// DeleteReservation handles DELETE /api/reservations/:id
func (h *ReservationHandler) DeleteReservation(c *gin.Context) {
	id := c.Param("id")
	reservationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	err = h.reservationService.DeleteReservation(reservationID)
	if err != nil {
		switch err {
		case services.ErrReservationNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
		case services.ErrSpaceNotFound:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch space"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete reservation"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reservation cancelled successfully"})
}

// toReservationResponseDTO converts a domain entity to a response DTO
func toReservationResponseDTO(r *entities.Reservation) dto.ReservationResponseDTO {
	return dto.ReservationResponseDTO{
		ID:        r.ID,
		SpaceID:   r.SpaceID,
		UserID:    r.UserID,
		UserName:  r.UserName,
		Date:      r.Date.Format("2006-01-02"),
		StartTime: r.StartTime,
		EndTime:   r.EndTime,
		Status:    string(r.Status),
		Notes:     r.Notes,
		CreatedAt: r.CreatedAt.Format(time.RFC3339),
		UpdatedAt: r.UpdatedAt.Format(time.RFC3339),
	}
}


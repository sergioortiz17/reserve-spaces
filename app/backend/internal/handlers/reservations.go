package handlers

import (
	"log"
	"net/http"
	"office-reservations/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Reservations handlers
func (h *Handler) GetReservations(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")
	userID := c.Query("user_id")
	spaceID := c.Query("space_id")

	query := h.db.Preload("Space")

	// Date range filter
	if from != "" {
		if fromDate, err := time.Parse("2006-01-02", from); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'from' date format (use YYYY-MM-DD)"})
			return
		} else {
			query = query.Where("date >= ?", fromDate)
		}
	}

	if to != "" {
		if toDate, err := time.Parse("2006-01-02", to); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 'to' date format (use YYYY-MM-DD)"})
			return
		} else {
			query = query.Where("date <= ?", toDate)
		}
	}

	// User filter
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// Space filter
	if spaceID != "" {
		if _, err := uuid.Parse(spaceID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid space ID"})
			return
		}
		query = query.Where("space_id = ?", spaceID)
	}

	var reservations []models.Reservation
	if err := query.Order("date ASC, start_time ASC").Find(&reservations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservations"})
		return
	}

	c.JSON(http.StatusOK, reservations)
}

func (h *Handler) GetReservation(c *gin.Context) {
	id := c.Param("id")
	reservationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	var reservation models.Reservation
	if err := h.db.Preload("Space").First(&reservation, reservationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservation"})
		return
	}

	c.JSON(http.StatusOK, reservation)
}

func (h *Handler) CreateReservation(c *gin.Context) {
	var req models.CreateReservationRequest
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

	// Validate reservation date (max 1 week in advance)
	now := time.Now()
	maxDate := now.AddDate(0, 0, 7) // 1 week from now
	if date.After(maxDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot reserve more than 1 week in advance"})
		return
	}

	// Validate date is not in the past
	if date.Before(now.Truncate(24 * time.Hour)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot reserve dates in the past"})
		return
	}

	// Verify space exists
	var space models.Space
	if err := h.db.First(&space, req.SpaceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Space not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify space"})
		return
	}

	// Parse and validate times if provided
	var startTime, endTime *string
	if req.StartTime != "" {
		if _, err := time.Parse("15:04", req.StartTime); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time format (use HH:MM)"})
			return
		}
		startTime = &req.StartTime
	}
	if req.EndTime != "" {
		if _, err := time.Parse("15:04", req.EndTime); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time format (use HH:MM)"})
			return
		}
		endTime = &req.EndTime
	}

	// Validate time range
	if startTime != nil && endTime != nil {
		start, _ := time.Parse("15:04", *startTime)
		end, _ := time.Parse("15:04", *endTime)
		if !start.Before(end) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Start time must be before end time"})
			return
		}
	}

	// Check for conflicts
	var existingReservation models.Reservation
	conflictQuery := h.db.Where("space_id = ? AND date = ? AND status = 'active'", req.SpaceID, date)
	
	if startTime != nil {
		conflictQuery = conflictQuery.Where("start_time = ?", startTime)
	} else {
		// For all-day reservations, check if there are any reservations for that day
		conflictQuery = conflictQuery.Where("start_time IS NULL OR start_time IS NOT NULL")
	}

	if err := conflictQuery.First(&existingReservation).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Space is already reserved for this time slot"})
		return
	} else if err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for conflicts"})
		return
	}

	reservation := models.Reservation{
		SpaceID:   req.SpaceID,
		UserID:    req.UserID,
		UserName:  req.UserName,
		Date:      date,
		StartTime: startTime,
		EndTime:   endTime,
		Notes:     req.Notes,
		Status:    "active",
	}

	if err := h.db.Create(&reservation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reservation"})
		return
	}

	// Load the space information
	if err := h.db.Preload("Space").First(&reservation, reservation.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load reservation details"})
		return
	}

	c.JSON(http.StatusCreated, reservation)
}

func (h *Handler) UpdateReservation(c *gin.Context) {
	id := c.Param("id")
	reservationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	var req models.UpdateReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("UpdateReservation binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("UpdateReservation request: %+v", req)

	var reservation models.Reservation
	if err := h.db.First(&reservation, reservationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservation"})
		return
	}

	// Check if reservation is cancelled
	if reservation.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot update cancelled reservation"})
		return
	}

	// Update fields if provided
	if req.UserName != "" {
		reservation.UserName = req.UserName
	}
	if req.Date != "" {
		if date, err := time.Parse("2006-01-02", req.Date); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (use YYYY-MM-DD)"})
			return
		} else {
			reservation.Date = date
		}
	}
	if req.StartTime != "" {
		if _, err := time.Parse("15:04", req.StartTime); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time format (use HH:MM)"})
			return
		}
		reservation.StartTime = &req.StartTime
	}
	if req.EndTime != "" {
		if _, err := time.Parse("15:04", req.EndTime); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time format (use HH:MM)"})
			return
		}
		reservation.EndTime = &req.EndTime
	}
	if req.Status != "" {
		reservation.Status = req.Status
	}
	if req.Notes != "" {
		reservation.Notes = req.Notes
	}

	if err := h.db.Save(&reservation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reservation"})
		return
	}

	c.JSON(http.StatusOK, reservation)
}

func (h *Handler) DeleteReservation(c *gin.Context) {
	id := c.Param("id")
	reservationID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reservation ID"})
		return
	}

	// Soft delete by updating status to cancelled
	if err := h.db.Model(&models.Reservation{}).
		Where("id = ?", reservationID).
		Update("status", "cancelled").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel reservation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reservation cancelled successfully"})
}
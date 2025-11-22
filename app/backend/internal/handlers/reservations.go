package handlers

import (
	"log"
	"net/http"
	"office-reservations/internal/models"
	"regexp"
	"strings"
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

	// Always delete any existing reservations for this space/date/time before creating new one (overwrite behavior)
	// This ensures no unique constraint violations, even with cancelled reservations
	deleteQuery := h.db.Where("space_id = ? AND date = ?", req.SpaceID, date)
	
	if startTime != nil {
		// Normalize time format (HH:MM:SS -> HH:MM) for comparison
		normalizedTime := *startTime
		if len(normalizedTime) > 5 {
			normalizedTime = normalizedTime[:5]
		}
		// Delete reservations with matching time (any status)
		deleteQuery = deleteQuery.Where("(start_time = ? OR start_time = ? OR start_time::text LIKE ?)", 
			startTime, normalizedTime, normalizedTime+":%")
	} else {
		deleteQuery = deleteQuery.Where("start_time IS NULL")
	}

	// For meeting rooms, delete all related group reservations
	if space.Type == "meeting_room" {
		// Extract base name (remove trailing numbers)
		re := regexp.MustCompile(`\s*\d+$`)
		baseName := strings.TrimSpace(strings.ToLower(re.ReplaceAllString(space.Name, "")))

		// Find all meeting room spaces with the same base name
		var groupSpaces []models.Space
		if err := h.db.Where("type = ? AND map_id = ?", "meeting_room", space.MapID).
			Find(&groupSpaces).Error; err == nil {
			var matchingSpaceIDs []uuid.UUID
			for _, s := range groupSpaces {
				sBaseName := strings.TrimSpace(strings.ToLower(re.ReplaceAllString(s.Name, "")))
				if sBaseName == baseName {
					matchingSpaceIDs = append(matchingSpaceIDs, s.ID)
				}
			}

			// Delete ALL reservations (active or cancelled) for these spaces with same date and time
			if len(matchingSpaceIDs) > 0 {
				groupDeleteQuery := h.db.Where("space_id IN ? AND date = ?", matchingSpaceIDs, date)
				
				if startTime != nil {
					normalizedTime := *startTime
					if len(normalizedTime) > 5 {
						normalizedTime = normalizedTime[:5]
					}
					groupDeleteQuery = groupDeleteQuery.Where("(start_time = ? OR start_time = ? OR start_time::text LIKE ?)", 
						startTime, normalizedTime, normalizedTime+":%")
				} else {
					groupDeleteQuery = groupDeleteQuery.Where("start_time IS NULL")
				}

				// Delete all reservations (physical delete to avoid any constraint issues)
				groupDeleteQuery.Delete(&models.Reservation{})
			}
		}
	} else {
		// For non-meeting rooms, delete all reservations for this space/date/time (any status)
		deleteQuery.Delete(&models.Reservation{})
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
		// Check if it's a duplicate key error
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505") {
			c.JSON(http.StatusConflict, gin.H{"error": "Space is already reserved for this time slot"})
			return
		}
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

	// Get the reservation to check if it's a meeting room
	var reservation models.Reservation
	if err := h.db.First(&reservation, reservationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservation"})
		return
	}

	// Get the space to check if it's a meeting room
	var space models.Space
	if err := h.db.First(&space, reservation.SpaceID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch space"})
		return
	}

	// If it's a meeting room, find and delete all related reservations in the group
	if space.Type == "meeting_room" {
		// Extract base name (remove trailing numbers) - e.g., "meeting room 38" -> "meeting room"
		// Use regexp to match the same pattern as frontend: remove trailing numbers and spaces
		re := regexp.MustCompile(`\s*\d+$`)
		baseName := strings.TrimSpace(strings.ToLower(re.ReplaceAllString(space.Name, "")))

		// Find all meeting room spaces with the same base name
		var groupSpaces []models.Space
		if err := h.db.Where("type = ? AND map_id = ?", "meeting_room", space.MapID).
			Find(&groupSpaces).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find group spaces"})
			return
		}

		// Filter spaces that match the base name pattern
		var matchingSpaceIDs []uuid.UUID
		for _, s := range groupSpaces {
			sBaseName := strings.TrimSpace(strings.ToLower(re.ReplaceAllString(s.Name, "")))
			if sBaseName == baseName {
				matchingSpaceIDs = append(matchingSpaceIDs, s.ID)
			}
		}

		// Delete all reservations for these spaces with same user, date, and time
		if len(matchingSpaceIDs) > 0 {
			query := h.db.Model(&models.Reservation{}).
				Where("space_id IN ? AND user_name = ? AND date = ? AND status = 'active'",
					matchingSpaceIDs, reservation.UserName, reservation.Date)
			
			if reservation.StartTime != nil {
				// Normalize time for comparison (HH:MM or HH:MM:SS)
				normalizedTime := (*reservation.StartTime)[:5] // Get HH:MM
				query = query.Where("(start_time = ? OR start_time::text LIKE ?)", 
					reservation.StartTime, normalizedTime+":%")
			} else {
				query = query.Where("start_time IS NULL")
			}

			if reservation.EndTime != nil {
				normalizedEndTime := (*reservation.EndTime)[:5]
				query = query.Where("(end_time = ? OR end_time::text LIKE ?)", 
					reservation.EndTime, normalizedEndTime+":%")
			} else {
				query = query.Where("end_time IS NULL")
			}

			if err := query.Update("status", "cancelled").Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel group reservations"})
				return
			}

			c.JSON(http.StatusOK, gin.H{"message": "Group reservation cancelled successfully"})
			return
		}
	}

	// For non-meeting rooms or if group not found, delete single reservation
	if err := h.db.Model(&models.Reservation{}).
		Where("id = ?", reservationID).
		Update("status", "cancelled").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel reservation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reservation cancelled successfully"})
}

// CleanupMeetingRoomReservations cancels all reservations for a meeting room group
func (h *Handler) CleanupMeetingRoomReservations(c *gin.Context) {
	spaceIDParam := c.Param("space_id")
	spaceID, err := uuid.Parse(spaceIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid space ID"})
		return
	}

	// Get the space
	var space models.Space
	if err := h.db.First(&space, spaceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Space not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch space"})
		return
	}

	// Only allow cleanup for meeting rooms
	if space.Type != "meeting_room" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This endpoint is only for meeting rooms"})
		return
	}

	// Extract base name (remove trailing numbers)
	re := regexp.MustCompile(`\s*\d+$`)
	baseName := strings.TrimSpace(strings.ToLower(re.ReplaceAllString(space.Name, "")))

	// Find all meeting room spaces with the same base name
	var groupSpaces []models.Space
	if err := h.db.Where("type = ? AND map_id = ?", "meeting_room", space.MapID).
		Find(&groupSpaces).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find group spaces"})
		return
	}

	var matchingSpaceIDs []uuid.UUID
	for _, s := range groupSpaces {
		sBaseName := strings.TrimSpace(strings.ToLower(re.ReplaceAllString(s.Name, "")))
		if sBaseName == baseName {
			matchingSpaceIDs = append(matchingSpaceIDs, s.ID)
		}
	}

	if len(matchingSpaceIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No group spaces found", "cancelled": 0})
		return
	}

	// Cancel ALL reservations (active and cancelled) for these spaces
	result := h.db.Model(&models.Reservation{}).
		Where("space_id IN ?", matchingSpaceIDs).
		Update("status", "cancelled")

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cleanup reservations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Meeting room group reservations cleaned up successfully",
		"cancelled": result.RowsAffected,
		"spaces": len(matchingSpaceIDs),
	})
}
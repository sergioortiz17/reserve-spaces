package handlers

import (
	"net/http"
	"office-reservations/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Spaces handlers
func (h *Handler) GetSpaces(c *gin.Context) {
	mapID := c.Query("map_id")
	
	var spaces []models.Space
	query := h.db.Preload("Map")
	
	if mapID != "" {
		if _, err := uuid.Parse(mapID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid map ID"})
			return
		}
		query = query.Where("map_id = ?", mapID)
	}
	
	if err := query.Find(&spaces).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch spaces"})
		return
	}
	
	c.JSON(http.StatusOK, spaces)
}

func (h *Handler) GetSpace(c *gin.Context) {
	id := c.Param("id")
	spaceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid space ID"})
		return
	}

	var space models.Space
	if err := h.db.Preload("Map").Preload("Reservations").First(&space, spaceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Space not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch space"})
		return
	}
	
	c.JSON(http.StatusOK, space)
}

func (h *Handler) CreateSpace(c *gin.Context) {
	var req models.CreateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify map exists
	var officeMap models.OfficeMap
	if err := h.db.First(&officeMap, req.MapID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Map not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify map"})
		return
	}

	space := models.Space{
		MapID:    req.MapID,
		Name:     req.Name,
		Type:     req.Type,
		X:        req.X,
		Y:        req.Y,
		Width:    req.Width,
		Height:   req.Height,
		Capacity: req.Capacity,
	}

	// Set defaults
	if space.Width == 0 {
		space.Width = 1
	}
	if space.Height == 0 {
		space.Height = 1
	}
	if space.Capacity == 0 {
		space.Capacity = 1
	}

	if err := h.db.Create(&space).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create space"})
		return
	}

	c.JSON(http.StatusCreated, space)
}

func (h *Handler) UpdateSpace(c *gin.Context) {
	id := c.Param("id")
	spaceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid space ID"})
		return
	}

	var req models.UpdateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var space models.Space
	if err := h.db.First(&space, spaceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Space not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch space"})
		return
	}

	// Update fields if provided
	if req.Name != "" {
		space.Name = req.Name
	}
	if req.Type != "" {
		space.Type = req.Type
	}
	if req.X != nil {
		space.X = *req.X
	}
	if req.Y != nil {
		space.Y = *req.Y
	}
	if req.Width != nil {
		space.Width = *req.Width
	}
	if req.Height != nil {
		space.Height = *req.Height
	}
	if req.Capacity != nil {
		space.Capacity = *req.Capacity
	}

	if err := h.db.Save(&space).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update space"})
		return
	}

	c.JSON(http.StatusOK, space)
}

func (h *Handler) DeleteSpace(c *gin.Context) {
	id := c.Param("id")
	spaceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid space ID"})
		return
	}

	if err := h.db.Delete(&models.Space{}, spaceID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete space"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Space deleted successfully"})
}

func (h *Handler) GetSpaceAvailability(c *gin.Context) {
	id := c.Param("id")
	spaceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid space ID"})
		return
	}

	dateStr := c.Query("date")
	if dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date parameter is required (YYYY-MM-DD)"})
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (use YYYY-MM-DD)"})
		return
	}

	// Verify space exists
	var space models.Space
	if err := h.db.First(&space, spaceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Space not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch space"})
		return
	}

	// Get reservations for the date
	var reservations []models.Reservation
	if err := h.db.Where("space_id = ? AND date = ? AND status = 'active'", spaceID, date).
		Find(&reservations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservations"})
		return
	}

	availability := models.AvailabilityResponse{
		SpaceID:      spaceID,
		Date:         dateStr,
		IsAvailable:  len(reservations) == 0,
		Reservations: reservations,
	}

	c.JSON(http.StatusOK, availability)
}
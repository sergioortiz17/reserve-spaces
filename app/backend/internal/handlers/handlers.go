package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"office-reservations/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Handler holds the database connection
type Handler struct {
	db *gorm.DB
}

// New creates a new handler instance
func New(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

// HealthCheck endpoint
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC(),
		"service":   "office-reservations-api",
	})
}

// Maps handlers
func (h *Handler) GetMaps(c *gin.Context) {
	var maps []models.OfficeMap
	if err := h.db.Preload("Spaces").Find(&maps).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch maps"})
		return
	}
	c.JSON(http.StatusOK, maps)
}

func (h *Handler) GetMap(c *gin.Context) {
	id := c.Param("id")
	mapID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid map ID"})
		return
	}

	var officeMap models.OfficeMap
	if err := h.db.Preload("Spaces").First(&officeMap, mapID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Map not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch map"})
		return
	}
	c.JSON(http.StatusOK, officeMap)
}

func (h *Handler) CreateMap(c *gin.Context) {
	var req models.CreateMapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	officeMap := models.OfficeMap{
		Name:        req.Name,
		Description: req.Description,
	}

	// Convert interface{} to JSON
	if jsonData, err := json.Marshal(req.JSONData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON data"})
		return
	} else {
		officeMap.JSONData = jsonData
	}

	if err := h.db.Create(&officeMap).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create map"})
		return
	}

	// Sync spaces from JSON data to database
	if err := h.syncSpacesFromJSON(officeMap.ID, req.JSONData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sync spaces"})
		return
	}

	// Reload with spaces
	if err := h.db.Preload("Spaces").First(&officeMap, officeMap.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload map"})
		return
	}

	c.JSON(http.StatusCreated, officeMap)
}

func (h *Handler) UpdateMap(c *gin.Context) {
	id := c.Param("id")
	mapID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid map ID"})
		return
	}

	var req models.UpdateMapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	fmt.Printf("UpdateMap request: Name=%s, Description=%s, JSONData=%+v\n", req.Name, req.Description, req.JSONData)

	var officeMap models.OfficeMap
	if err := h.db.First(&officeMap, mapID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Map not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch map"})
		return
	}

	// Update fields if provided
	if req.Name != "" {
		officeMap.Name = req.Name
	}
	if req.Description != "" {
		officeMap.Description = req.Description
	}
	if req.JSONData != nil {
		if jsonData, err := json.Marshal(req.JSONData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON data"})
			return
		} else {
			officeMap.JSONData = jsonData
		}
	}

	if err := h.db.Save(&officeMap).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update map"})
		return
	}

	// Sync spaces from JSON data to database
	fmt.Printf("req.JSONData is nil: %v\n", req.JSONData == nil)
	if req.JSONData != nil {
		fmt.Printf("Syncing spaces for map %s\n", mapID.String())
		if err := h.syncSpacesFromJSON(mapID, req.JSONData); err != nil {
			fmt.Printf("Error syncing spaces: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sync spaces"})
			return
		}
		fmt.Printf("Spaces synced successfully\n")
	} else {
		fmt.Printf("req.JSONData is nil, skipping space sync\n")
	}

	// Reload with spaces
	if err := h.db.Preload("Spaces").First(&officeMap, mapID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload map"})
		return
	}

	c.JSON(http.StatusOK, officeMap)
}

func (h *Handler) DeleteMap(c *gin.Context) {
	id := c.Param("id")
	mapID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid map ID"})
		return
	}

	if err := h.db.Delete(&models.OfficeMap{}, mapID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete map"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Map deleted successfully"})
}

// syncSpacesFromJSON synchronizes spaces from JSON data to the database
func (h *Handler) syncSpacesFromJSON(mapID uuid.UUID, jsonData interface{}) error {
	fmt.Printf("Starting syncSpacesFromJSON for map %s\n", mapID.String())
	
	// Parse JSON data
	jsonBytes, err := json.Marshal(jsonData)
	if err != nil {
		fmt.Printf("Error marshaling JSON: %v\n", err)
		return err
	}

	fmt.Printf("JSON data: %s\n", string(jsonBytes))

	var mapData struct {
		Spaces []struct {
			ID     string `json:"id"`
			Name   string `json:"name"`
			Type   string `json:"type"`
			X      int    `json:"x"`
			Y      int    `json:"y"`
			Width  int    `json:"width"`
			Height int    `json:"height"`
		} `json:"spaces"`
	}

	if err := json.Unmarshal(jsonBytes, &mapData); err != nil {
		fmt.Printf("Error unmarshaling JSON: %v\n", err)
		return err
	}

	fmt.Printf("Found %d spaces in JSON\n", len(mapData.Spaces))

	// Delete existing spaces for this map
	if err := h.db.Where("map_id = ?", mapID).Delete(&models.Space{}).Error; err != nil {
		fmt.Printf("Error deleting existing spaces: %v\n", err)
		return err
	}

	// Create new spaces
	for i, spaceData := range mapData.Spaces {
		fmt.Printf("Creating space %d: %+v\n", i, spaceData)
		space := models.Space{
			MapID:    mapID,
			Name:     spaceData.Name,
			Type:     spaceData.Type,
			X:        spaceData.X,
			Y:        spaceData.Y,
			Width:    spaceData.Width,
			Height:   spaceData.Height,
			Capacity: 1, // Default capacity
		}

		if err := h.db.Create(&space).Error; err != nil {
			fmt.Printf("Error creating space: %v\n", err)
			return err
		}
		fmt.Printf("Space created successfully with ID: %s\n", space.ID.String())
	}

	fmt.Printf("syncSpacesFromJSON completed successfully\n")
	return nil
}
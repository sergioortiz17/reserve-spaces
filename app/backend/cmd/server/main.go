package main

import (
	"log"
	"office-reservations/internal/database"
	"office-reservations/internal/handlers"
	"office-reservations/internal/middleware"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	db, err := database.Initialize()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize handlers
	h := handlers.New(db)

	// Setup Gin router
	r := gin.Default()

	// CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:5173", "http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// Middleware
	r.Use(middleware.Logger())
	r.Use(middleware.ErrorHandler())

	// API routes
	api := r.Group("/api")
	{
		// Health check
		api.GET("/health", h.HealthCheck)

		// Maps
		maps := api.Group("/maps")
		{
			maps.GET("", h.GetMaps)
			maps.GET("/:id", h.GetMap)
			maps.POST("", h.CreateMap)
			maps.PUT("/:id", h.UpdateMap)
			maps.DELETE("/:id", h.DeleteMap)
		}

		// Spaces
		spaces := api.Group("/spaces")
		{
			spaces.GET("", h.GetSpaces)
			spaces.GET("/:id", h.GetSpace)
			spaces.POST("", h.CreateSpace)
			spaces.PUT("/:id", h.UpdateSpace)
			spaces.DELETE("/:id", h.DeleteSpace)
			spaces.GET("/:id/availability", h.GetSpaceAvailability)
		}

		// Reservations
		reservations := api.Group("/reservations")
		{
			reservations.GET("", h.GetReservations)
			reservations.GET("/:id", h.GetReservation)
			reservations.POST("", h.CreateReservation)
			reservations.PUT("/:id", h.UpdateReservation)
			reservations.DELETE("/:id", h.DeleteReservation)
			reservations.POST("/cleanup/meeting-room/:space_id", h.CleanupMeetingRoomReservations)
		}
	}

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
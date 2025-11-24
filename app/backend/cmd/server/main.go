package main

import (
	"log"
	"office-reservations/internal/database"
	"office-reservations/internal/handlers"
	"office-reservations/internal/infrastructure/di"
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

	// Initialize dependency injection container (Clean Architecture)
	container := di.NewContainer(db)

	// Initialize legacy handlers (for Maps and Spaces - to be refactored later)
	legacyHandlers := handlers.New(db)

	// Setup Gin router
	r := gin.Default()

	// CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:5173", "http://localhost:3000", "http://0.0.0.0:5173", "http://127.0.0.1:5173"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	// Middleware
	r.Use(middleware.Logger())
	r.Use(middleware.ErrorHandler())

	// API routes
	api := r.Group("/api")
	{
		// Health check
		api.GET("/health", legacyHandlers.HealthCheck)

		// Maps (using legacy handlers - to be refactored)
		maps := api.Group("/maps")
		{
			maps.GET("", legacyHandlers.GetMaps)
			maps.GET("/:id", legacyHandlers.GetMap)
			maps.POST("", legacyHandlers.CreateMap)
			maps.PUT("/:id", legacyHandlers.UpdateMap)
			maps.DELETE("/:id", legacyHandlers.DeleteMap)
		}

		// Spaces (using legacy handlers - to be refactored)
		spaces := api.Group("/spaces")
		{
			spaces.GET("", legacyHandlers.GetSpaces)
			spaces.GET("/:id", legacyHandlers.GetSpace)
			spaces.POST("", legacyHandlers.CreateSpace)
			spaces.PUT("/:id", legacyHandlers.UpdateSpace)
			spaces.DELETE("/:id", legacyHandlers.DeleteSpace)
			spaces.GET("/:id/availability", legacyHandlers.GetSpaceAvailability)
		}

		// Reservations (using new Clean Architecture handlers)
		reservations := api.Group("/reservations")
		{
			reservations.GET("", container.ReservationHandler.GetReservations)
			reservations.GET("/:id", container.ReservationHandler.GetReservation)
			reservations.POST("", container.ReservationHandler.CreateReservation)
			reservations.PUT("/:id", container.ReservationHandler.UpdateReservation)
			reservations.DELETE("/:id", container.ReservationHandler.DeleteReservation)
			// Legacy endpoint - keeping for backward compatibility
			reservations.POST("/cleanup/meeting-room/:space_id", legacyHandlers.CleanupMeetingRoomReservations)
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
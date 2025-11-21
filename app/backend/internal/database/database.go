package database

import (
	"fmt"
	"office-reservations/internal/models"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Initialize creates and returns a database connection
func Initialize() (*gorm.DB, error) {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "office_user")
	password := getEnv("DB_PASSWORD", "office_pass")
	dbname := getEnv("DB_NAME", "office_reservations")
	sslmode := getEnv("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return db, nil
}

// RunMigrations runs database migrations
func RunMigrations(db *gorm.DB) error {
	// Enable UUID extension
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
		return fmt.Errorf("failed to create uuid extension: %w", err)
	}

	// Auto migrate models
	if err := db.AutoMigrate(
		&models.OfficeMap{},
		&models.Space{},
		&models.Reservation{},
	); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Create indexes
	if err := createIndexes(db); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	return nil
}

// createIndexes creates database indexes for better performance
func createIndexes(db *gorm.DB) error {
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_spaces_map_id ON spaces(map_id)",
		"CREATE INDEX IF NOT EXISTS idx_reservations_space_id ON reservations(space_id)",
		"CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)",
		"CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id)",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_unique ON reservations(space_id, date, start_time) WHERE status = 'active'",
	}

	for _, index := range indexes {
		if err := db.Exec(index).Error; err != nil {
			return fmt.Errorf("failed to create index: %s, error: %w", index, err)
		}
	}

	return nil
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
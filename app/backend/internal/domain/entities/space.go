package entities

import (
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// SpaceType represents the type of a space
type SpaceType string

const (
	SpaceTypeWorkstation  SpaceType = "workstation"
	SpaceTypeMeetingRoom  SpaceType = "meeting_room"
	SpaceTypeCubicle      SpaceType = "cubicle"
	SpaceTypeInvalidSpace SpaceType = "invalid_space"
)

// Space represents an individual space in the office domain
type Space struct {
	ID        uuid.UUID
	MapID     uuid.UUID
	Name      string
	Type      SpaceType
	X         int
	Y         int
	Width     int
	Height    int
	Capacity  int
	CreatedAt time.Time
	UpdatedAt time.Time
}

// IsMeetingRoom returns true if the space is a meeting room
func (s *Space) IsMeetingRoom() bool {
	return s.Type == SpaceTypeMeetingRoom
}

// GetBaseName extracts the base name from a meeting room (removes trailing numbers)
// Uses the same regex pattern as the backend: \s*\d+$
func (s *Space) GetBaseName() string {
	if !s.IsMeetingRoom() {
		return s.Name
	}
	// Use regex to remove trailing numbers (same as backend)
	re := regexp.MustCompile(`\s*\d+$`)
	baseName := re.ReplaceAllString(s.Name, "")
	return strings.TrimSpace(baseName)
}


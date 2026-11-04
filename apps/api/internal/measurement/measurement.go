// Package measurement contains the measurement domain rules and service.
package measurement

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

// ErrNotFound is returned when no measurement matches a query.
var ErrNotFound = errors.New("measurement not found")

// ValidationError describes a rejected input field.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	if e.Field == "" {
		return e.Message
	}
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// Measurement is a single aggregated reading from a station.
type Measurement struct {
	ID            int64     `json:"id"`
	StationID     string    `json:"station_id"`
	ObservedAt    time.Time `json:"observed_at"`
	ReceivedAt    time.Time `json:"received_at"`
	WindSpeed     *float64  `json:"wind_speed"`
	WindDirection *float64  `json:"wind_direction"`
	Temperature   float64   `json:"temperature"`
	Humidity      float64   `json:"humidity"`
	CO2           *float64  `json:"co2"`
	PM25          *float64  `json:"pm25"`
	PM10          *float64  `json:"pm10"`
}

// CreateInput is a validated measurement submission.
type CreateInput struct {
	StationID     string
	ObservedAt    *time.Time
	WindSpeed     *float64
	WindDirection *float64
	Temperature   float64
	Humidity      float64
	CO2           *float64
	PM25          *float64
	PM10          *float64
}

// ListInput filters a measurement history query.
type ListInput struct {
	StationID string
	Start     *time.Time
	End       *time.Time
	Offset    int
	Limit     int
}

// Repository stores and retrieves measurements.
type Repository interface {
	Create(ctx context.Context, measurement Measurement) (Measurement, error)
	List(ctx context.Context, filter ListInput) ([]Measurement, error)
	Latest(ctx context.Context, stationID string) (Measurement, error)
	Ping(ctx context.Context) error
}

// Service applies the measurement business rules.
type Service struct {
	repository Repository
	now        func() time.Time
}

// NewService creates a Service.
func NewService(repository Repository) *Service {
	return &Service{repository: repository, now: time.Now}
}

// Create validates and stores a measurement.
func (s *Service) Create(ctx context.Context, input CreateInput) (Measurement, error) {
	stationID := strings.TrimSpace(input.StationID)
	if stationID == "" {
		return Measurement{}, &ValidationError{Field: "station_id", Message: "must not be blank"}
	}
	if utf8.RuneCountInString(stationID) > 64 {
		return Measurement{}, &ValidationError{Field: "station_id", Message: "must be at most 64 characters"}
	}

	now := s.now().UTC()
	observedAt := now
	if input.ObservedAt != nil {
		observedAt = input.ObservedAt.UTC()
	}

	return s.repository.Create(ctx, Measurement{
		StationID:     stationID,
		ObservedAt:    observedAt,
		ReceivedAt:    now,
		WindSpeed:     input.WindSpeed,
		WindDirection: input.WindDirection,
		Temperature:   input.Temperature,
		Humidity:      input.Humidity,
		CO2:           input.CO2,
		PM25:          input.PM25,
		PM10:          input.PM10,
	})
}

// List returns measurements matching the filter.
func (s *Service) List(ctx context.Context, input ListInput) ([]Measurement, error) {
	stationID := strings.TrimSpace(input.StationID)
	if input.Offset < 0 {
		return nil, &ValidationError{Field: "offset", Message: "must be greater than or equal to 0"}
	}
	if input.Limit < 1 || input.Limit > 1000 {
		return nil, &ValidationError{Field: "limit", Message: "must be between 1 and 1000"}
	}
	if input.Start != nil && input.End != nil && input.Start.After(*input.End) {
		return nil, &ValidationError{Field: "start", Message: "must not be later than end"}
	}

	return s.repository.List(ctx, ListInput{
		StationID: stationID,
		Start:     input.Start,
		End:       input.End,
		Offset:    input.Offset,
		Limit:     input.Limit,
	})
}

// Latest returns the newest measurement, optionally for one station.
func (s *Service) Latest(ctx context.Context, stationID string) (Measurement, error) {
	return s.repository.Latest(ctx, strings.TrimSpace(stationID))
}

// Ping verifies the repository's database connection.
func (s *Service) Ping(ctx context.Context) error {
	return s.repository.Ping(ctx)
}

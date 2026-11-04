// Package postgres implements the measurement repository with pgx.
package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/measurement"
)

const columns = `id, station_id, observed_at, received_at, wind_speed,
	wind_direction, temperature, humidity, co2, pm25, pm10, latitude, longitude`

type scanner interface {
	Scan(dest ...any) error
}

// Repository stores measurements in PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// New creates a Repository.
func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Create inserts a measurement and returns the stored row.
func (r *Repository) Create(ctx context.Context, m measurement.Measurement) (measurement.Measurement, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO measurements (
			station_id, observed_at, received_at, wind_speed, wind_direction,
			temperature, humidity, co2, pm25, pm10, latitude, longitude
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING `+columns,
		m.StationID, m.ObservedAt, m.ReceivedAt, m.WindSpeed, m.WindDirection,
		m.Temperature, m.Humidity, m.CO2, m.PM25, m.PM10, m.Latitude, m.Longitude,
	)
	return scan(row)
}

// List returns measurements matching the filter, newest first.
func (r *Repository) List(ctx context.Context, filter measurement.ListInput) ([]measurement.Measurement, error) {
	query := `SELECT ` + columns + ` FROM measurements WHERE TRUE`
	args := make([]any, 0, 5)

	if filter.StationID != "" {
		args = append(args, filter.StationID)
		query += fmt.Sprintf(" AND station_id = $%d", len(args))
	}
	if filter.Start != nil {
		args = append(args, *filter.Start)
		query += fmt.Sprintf(" AND observed_at >= $%d", len(args))
	}
	if filter.End != nil {
		args = append(args, *filter.End)
		query += fmt.Sprintf(" AND observed_at <= $%d", len(args))
	}

	args = append(args, filter.Limit, filter.Offset)
	query += fmt.Sprintf(
		" ORDER BY observed_at DESC, id DESC LIMIT $%d OFFSET $%d",
		len(args)-1, len(args),
	)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	measurements := make([]measurement.Measurement, 0, min(filter.Limit, 128))
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, err
		}
		measurements = append(measurements, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return measurements, nil
}

// Latest returns the newest measurement, optionally limited to one station.
func (r *Repository) Latest(ctx context.Context, stationID string) (measurement.Measurement, error) {
	query := `SELECT ` + columns + ` FROM measurements`
	args := make([]any, 0, 1)
	if stationID != "" {
		args = append(args, stationID)
		query += " WHERE station_id = $1"
	}
	query += " ORDER BY observed_at DESC, id DESC LIMIT 1"

	item, err := scan(r.pool.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return measurement.Measurement{}, measurement.ErrNotFound
	}
	return item, err
}

// Ping verifies the connection pool can reach PostgreSQL.
func (r *Repository) Ping(ctx context.Context) error {
	return r.pool.Ping(ctx)
}

func scan(row scanner) (measurement.Measurement, error) {
	var item measurement.Measurement
	err := row.Scan(
		&item.ID,
		&item.StationID,
		&item.ObservedAt,
		&item.ReceivedAt,
		&item.WindSpeed,
		&item.WindDirection,
		&item.Temperature,
		&item.Humidity,
		&item.CO2,
		&item.PM25,
		&item.PM10,
		&item.Latitude,
		&item.Longitude,
	)
	if err != nil {
		return measurement.Measurement{}, err
	}
	item.ObservedAt = item.ObservedAt.UTC()
	item.ReceivedAt = item.ReceivedAt.UTC()
	return item, nil
}

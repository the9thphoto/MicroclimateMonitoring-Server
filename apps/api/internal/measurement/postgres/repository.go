// Package postgres implements the measurement repository with pgx.
package postgres

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

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

// Frames returns the newest observation per station in fixed time buckets.
func (r *Repository) Frames(ctx context.Context, query measurement.FrameQuery) ([]measurement.Frame, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT ON (station_id, bucket)
			bucket, `+columns+`
		FROM (
			SELECT
				date_bin(make_interval(secs => $1), observed_at, $2) AS bucket,
				`+columns+`
			FROM measurements
			WHERE observed_at >= $2 AND observed_at < $3
		) bucketed
		ORDER BY station_id, bucket, observed_at DESC, id DESC
	`, int(query.Step.Seconds()), query.Start, query.End)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byTime := make(map[int64]*measurement.Frame)
	order := make([]int64, 0)
	for rows.Next() {
		var bucket time.Time
		var item measurement.Measurement
		if err := rows.Scan(
			&bucket,
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
		); err != nil {
			return nil, err
		}
		item.ObservedAt = item.ObservedAt.UTC()
		item.ReceivedAt = item.ReceivedAt.UTC()
		key := bucket.UTC().UnixNano()
		frame, exists := byTime[key]
		if !exists {
			frame = &measurement.Frame{Time: bucket.UTC(), Stations: make([]measurement.Measurement, 0, 16)}
			byTime[key] = frame
			order = append(order, key)
		}
		frame.Stations = append(frame.Stations, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	sort.Slice(order, func(i, j int) bool { return order[i] < order[j] })
	frames := make([]measurement.Frame, 0, len(order))
	for _, key := range order {
		frames = append(frames, *byTime[key])
	}
	return frames, nil
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

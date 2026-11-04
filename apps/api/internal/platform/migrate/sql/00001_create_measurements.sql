-- +goose Up
-- +goose StatementBegin
CREATE TABLE measurements (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(64) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    wind_speed DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    temperature DOUBLE PRECISION NOT NULL,
    humidity DOUBLE PRECISION NOT NULL,
    co2 DOUBLE PRECISION,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION
);
-- +goose StatementEnd

CREATE INDEX ix_measurements_station_id ON measurements (station_id);
CREATE INDEX ix_measurements_observed_at ON measurements (observed_at);
CREATE INDEX ix_measurements_station_observed ON measurements (station_id, observed_at);

-- +goose Down
DROP TABLE measurements;

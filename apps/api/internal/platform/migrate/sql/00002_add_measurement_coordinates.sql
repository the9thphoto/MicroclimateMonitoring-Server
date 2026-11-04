-- +goose Up
ALTER TABLE measurements
    ADD COLUMN latitude DOUBLE PRECISION,
    ADD COLUMN longitude DOUBLE PRECISION;

-- +goose Down
ALTER TABLE measurements
    DROP COLUMN longitude,
    DROP COLUMN latitude;

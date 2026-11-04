package migrate_test

import (
	"context"
	"testing"

	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/platform/migrate"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/testutil"
)

func TestUpCreatesSchemaAndIsIdempotent(t *testing.T) {
	databaseURL := testutil.Prepare(t)
	ctx := context.Background()

	if err := migrate.Up(ctx, databaseURL); err != nil {
		t.Fatalf("first migration: %v", err)
	}
	if err := migrate.Up(ctx, databaseURL); err != nil {
		t.Fatalf("second migration: %v", err)
	}

	pool := testutil.Open(t, databaseURL)

	var columns int
	if err := pool.QueryRow(ctx, `
		SELECT count(*) FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'measurements'
	`).Scan(&columns); err != nil {
		t.Fatalf("count columns: %v", err)
	}
	if columns != 11 {
		t.Fatalf("expected 11 columns, got %d", columns)
	}

	var indexes int
	if err := pool.QueryRow(ctx, `
		SELECT count(*) FROM pg_indexes
		WHERE schemaname = 'public' AND tablename = 'measurements'
	`).Scan(&indexes); err != nil {
		t.Fatalf("count indexes: %v", err)
	}
	if indexes != 4 {
		t.Fatalf("expected 4 indexes (primary key + 3), got %d", indexes)
	}

	var version int64
	if err := pool.QueryRow(ctx, `
		SELECT version_id FROM goose_db_version
		WHERE is_applied ORDER BY id DESC LIMIT 1
	`).Scan(&version); err != nil {
		t.Fatalf("read goose version: %v", err)
	}
	if version != 1 {
		t.Fatalf("expected goose version 1, got %d", version)
	}
}

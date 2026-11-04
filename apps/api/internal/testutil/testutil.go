// Package testutil prepares a disposable PostgreSQL database for tests.
package testutil

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"regexp"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/platform/postgres"
)

const defaultTestDatabase = "postgresql://weather:weather@127.0.0.1:5433/weather_test"

var testDatabasePattern = regexp.MustCompile(`^[A-Za-z0-9_]+_test$`)

// DatabaseURL returns the configured test database URL.
func DatabaseURL() string {
	if value := os.Getenv("TEST_DATABASE_URL"); value != "" {
		return value
	}
	return defaultTestDatabase
}

// Prepare ensures the test database exists and returns its URL.
func Prepare(t testing.TB) string {
	t.Helper()

	databaseURL := DatabaseURL()
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		t.Fatalf("TEST_DATABASE_URL is not a valid URL: %v", err)
	}
	if parsed.Scheme != "postgresql" && parsed.Scheme != "postgres" {
		t.Fatalf("TEST_DATABASE_URL must use postgresql://, got %q", parsed.Scheme)
	}
	databaseName := parsed.Path[1:]
	if !testDatabasePattern.MatchString(databaseName) {
		t.Fatalf(
			"refusing to run against %q: TEST_DATABASE_URL database name must match %s",
			databaseName,
			testDatabasePattern.String(),
		)
	}

	ctx := context.Background()
	maintenanceURL := *parsed
	maintenanceURL.Path = "/postgres"
	conn, err := pgx.Connect(ctx, maintenanceURL.String())
	if err != nil {
		t.Fatalf("connect to PostgreSQL maintenance database: %v", err)
	}
	defer conn.Close(ctx)

	var exists bool
	if err := conn.QueryRow(
		ctx,
		"SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)",
		databaseName,
	).Scan(&exists); err != nil {
		t.Fatalf("check test database: %v", err)
	}
	if !exists {
		if _, err := conn.Exec(ctx, fmt.Sprintf(`CREATE DATABASE "%s"`, databaseName)); err != nil {
			t.Fatalf("create test database %q: %v", databaseName, err)
		}
	}
	return databaseURL
}

// Open connects to the prepared test database and clears measurement rows.
func Open(t testing.TB, databaseURL string) *pgxpool.Pool {
	t.Helper()

	pool, err := postgres.Open(context.Background(), databaseURL)
	if err != nil {
		t.Fatalf("open test database pool: %v", err)
	}
	t.Cleanup(pool.Close)
	Truncate(t, pool)
	return pool
}

// Truncate removes every measurement so each test starts from a clean state.
func Truncate(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	if _, err := pool.Exec(
		context.Background(),
		"TRUNCATE TABLE measurements RESTART IDENTITY",
	); err != nil {
		t.Fatalf("truncate measurements: %v", err)
	}
}

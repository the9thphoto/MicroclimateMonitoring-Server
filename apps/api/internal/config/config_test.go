package config

import (
	"strings"
	"testing"
)

func TestLoadRequiresDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL is required") {
		t.Fatalf("expected required DATABASE_URL error, got %v", err)
	}
}

func TestLoadRejectsSQLite(t *testing.T) {
	t.Setenv("DATABASE_URL", "sqlite:///./weather.db")
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "SQLite is no longer supported") {
		t.Fatalf("expected SQLite rejection, got %v", err)
	}
}

func TestLoadRejectsPsycopgPrefix(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql+psycopg://user:pass@host/db")
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "+psycopg") {
		t.Fatalf("expected psycopg prefix rejection, got %v", err)
	}
}

func TestLoadNormalizesPostgresScheme(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://user:pass@db.example/weather")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.DatabaseURL != "postgresql://user:pass@db.example/weather" {
		t.Fatalf("unexpected normalized URL: %s", cfg.DatabaseURL)
	}
}

func TestLoadDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://weather:weather@127.0.0.1:5433/weather")
	t.Setenv("APP_NAME", "")
	t.Setenv("PORT", "")
	t.Setenv("CORS_ORIGINS", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.AppName != defaultAppName {
		t.Fatalf("unexpected app name: %s", cfg.AppName)
	}
	if cfg.Port != defaultPort {
		t.Fatalf("unexpected port: %s", cfg.Port)
	}
	if len(cfg.CORSOrigins) != 2 {
		t.Fatalf("unexpected CORS origins: %#v", cfg.CORSOrigins)
	}
}

func TestLoadParsesCORSOrigins(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://weather:weather@127.0.0.1:5433/weather")
	t.Setenv("CORS_ORIGINS", " http://localhost:8080 , ,http://127.0.0.1:5173 ")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(cfg.CORSOrigins) != 2 ||
		cfg.CORSOrigins[0] != "http://localhost:8080" ||
		cfg.CORSOrigins[1] != "http://127.0.0.1:5173" {
		t.Fatalf("unexpected CORS origins: %#v", cfg.CORSOrigins)
	}
}

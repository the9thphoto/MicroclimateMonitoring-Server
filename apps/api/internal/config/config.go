// Package config loads and validates runtime configuration from the environment.
package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
)

const (
	defaultAppName = "Campus Weather Monitor API"
	defaultPort    = "8000"
	defaultCORS    = "http://localhost:5173,http://127.0.0.1:5173"
)

// Config holds the values required to run the API.
type Config struct {
	AppName     string
	Port        string
	DatabaseURL string
	CORSOrigins []string
}

// Load reads configuration from the process environment.
func Load() (Config, error) {
	databaseURL, err := normalizeDatabaseURL(os.Getenv("DATABASE_URL"))
	if err != nil {
		return Config{}, err
	}

	appName := strings.TrimSpace(os.Getenv("APP_NAME"))
	if appName == "" {
		appName = defaultAppName
	}

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = defaultPort
	}

	origins := make([]string, 0, 4)
	for _, origin := range strings.Split(os.Getenv("CORS_ORIGINS"), ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	if len(origins) == 0 && strings.TrimSpace(os.Getenv("CORS_ORIGINS")) == "" {
		origins = append(origins, strings.Split(defaultCORS, ",")...)
	}

	return Config{
		AppName:     appName,
		Port:        port,
		DatabaseURL: databaseURL,
		CORSOrigins: origins,
	}, nil
}

func normalizeDatabaseURL(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", errors.New(
			"DATABASE_URL is required, for example " +
				"postgresql://weather:weather@127.0.0.1:5433/weather",
		)
	}
	if strings.HasPrefix(value, "sqlite:") || strings.HasPrefix(value, "sqlite+") {
		return "", errors.New(
			"SQLite is no longer supported; set DATABASE_URL to a PostgreSQL URL",
		)
	}
	if strings.HasPrefix(value, "postgresql+psycopg://") {
		return "", errors.New(
			"the psycopg driver prefix is not valid here; remove \"+psycopg\" from DATABASE_URL",
		)
	}
	if strings.HasPrefix(value, "postgres://") {
		value = "postgresql://" + strings.TrimPrefix(value, "postgres://")
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return "", fmt.Errorf("DATABASE_URL is not a valid URL: %w", err)
	}
	if parsed.Scheme != "postgresql" {
		return "", fmt.Errorf(
			"only PostgreSQL is supported; DATABASE_URL has scheme %q",
			parsed.Scheme,
		)
	}
	if parsed.Host == "" {
		return "", errors.New("DATABASE_URL must include a host")
	}
	if strings.TrimPrefix(parsed.Path, "/") == "" {
		return "", errors.New("DATABASE_URL must include a database name")
	}
	return value, nil
}

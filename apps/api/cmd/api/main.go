package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/config"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/httpapi"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/measurement"
	measurementpostgres "github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/measurement/postgres"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/platform/migrate"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/platform/postgres"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(healthcheck())
	}
	if err := run(); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := postgres.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := migrate.Up(ctx, cfg.DatabaseURL); err != nil {
		return err
	}

	repository := measurementpostgres.New(pool)
	service := measurement.NewService(repository)

	handler, _ := httpapi.New(service, repository, httpapi.Options{
		AppName:     cfg.AppName,
		CORSOrigins: cfg.CORSOrigins,
		Logger:      logger,
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("listening", "port", cfg.Port)
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown server: %w", err)
	}
	return nil
}

func healthcheck() int {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	client := &http.Client{Timeout: 3 * time.Second}
	response, err := client.Get("http://127.0.0.1:" + port + "/health")
	if err != nil {
		fmt.Fprintln(os.Stderr, "healthcheck:", err)
		return 1
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		fmt.Fprintln(os.Stderr, "healthcheck: unexpected status", response.StatusCode)
		return 1
	}
	return 0
}

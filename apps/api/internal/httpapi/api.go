// Package httpapi wires the Huma operations to the measurement service.
package httpapi

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"

	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/measurement"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/middleware"
)

// Options configures the HTTP API.
type Options struct {
	AppName     string
	CORSOrigins []string
	Logger      *slog.Logger
}

// Pinger reports database availability for the health endpoint.
type Pinger interface {
	Ping(ctx context.Context) error
}

// New builds the router and the Huma API description.
func New(service *measurement.Service, pinger Pinger, opts Options) (http.Handler, huma.API) {
	logger := opts.Logger
	if logger == nil {
		logger = slog.Default()
	}

	router := chi.NewRouter()
	router.Use(middleware.RequestLogger(logger))
	router.Use(middleware.Recoverer(logger))
	router.Use(middleware.MaxBody(1 << 20))
	router.Use(middleware.CORS(opts.CORSOrigins))

	config := huma.DefaultConfig(opts.AppName, "1.0.0")
	config.Info.Description = "校园风速、风向、温湿度、二氧化碳和颗粒物监测接口"
	config.OpenAPIPath = "/openapi"
	config.DocsPath = "/docs"
	// DefaultConfig adds a $schema link transformer; responses must keep the
	// original payload shape, so drop the hook and keep only the OpenAPI routes.
	config.CreateHooks = nil

	api := humachi.New(router, config)
	registerHealth(api, pinger)
	registerMeasurements(api, service, logger)
	registerFrames(api, service, logger)

	return router, api
}

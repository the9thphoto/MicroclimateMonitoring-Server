package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/measurement"
	measurementpostgres "github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/measurement/postgres"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/platform/migrate"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/testutil"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	databaseURL := testutil.Prepare(t)
	if err := migrate.Up(context.Background(), databaseURL); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	pool := testutil.Open(t, databaseURL)
	repository := measurementpostgres.New(pool)
	service := measurement.NewService(repository)

	handler, _ := New(service, repository, Options{
		AppName:     "test API",
		CORSOrigins: []string{"http://localhost:5173"},
	})
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return server
}

func call(t *testing.T, server *httptest.Server, method, path string, body string) (*http.Response, []byte) {
	t.Helper()

	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	request, err := http.NewRequest(method, server.URL+path, reader)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	return response, payload
}

func decode[T any](t *testing.T, payload []byte) T {
	t.Helper()
	var value T
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&value); err != nil {
		t.Fatalf("decode %s: %v", payload, err)
	}
	return value
}

func TestHealth(t *testing.T) {
	server := newTestServer(t)
	response, payload := call(t, server, http.MethodGet, "/health", "")
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status: %d %s", response.StatusCode, payload)
	}
	var health struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(payload, &health); err != nil || health.Status != "ok" {
		t.Fatalf("unexpected body: %s", payload)
	}
}

func TestHealthReportsDatabaseFailure(t *testing.T) {
	handler, _ := New(nil, failingPinger{}, Options{AppName: "test"})
	server := httptest.NewServer(handler)
	defer server.Close()

	response, payload := call(t, server, http.MethodGet, "/health", "")
	if response.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status: %d %s", response.StatusCode, payload)
	}
}

func TestCreateAndListMeasurement(t *testing.T) {
	server := newTestServer(t)
	payload := `{
		"station_id": "station-01",
		"observed_at": "2026-10-29T08:30:00+08:00",
		"wind_speed": 2.8,
		"wind_direction": 135,
		"temperature": 21.6,
		"humidity": 63,
		"co2": 418,
		"pm25": 18,
		"pm10": 34
	}`

	response, body := call(t, server, http.MethodPost, "/api/v1/measurements", payload)
	if response.StatusCode != http.StatusCreated {
		t.Fatalf("status: %d %s", response.StatusCode, body)
	}
	created := decode[measurement.Measurement](t, body)
	if created.StationID != "station-01" || created.Temperature != 21.6 {
		t.Fatalf("unexpected measurement: %#v", created)
	}
	if created.ObservedAt.Format(time.RFC3339) != "2026-10-29T00:30:00Z" {
		t.Fatalf("unexpected observed_at: %s", created.ObservedAt)
	}

	response, body = call(t, server, http.MethodGet, "/api/v1/measurements?station_id=station-01", "")
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status: %d %s", response.StatusCode, body)
	}
	items := decode[[]measurement.Measurement](t, body)
	if len(items) != 1 || items[0].ID != created.ID {
		t.Fatalf("unexpected list: %#v", items)
	}
}

func TestCreatePartialMeasurementStoresNulls(t *testing.T) {
	server := newTestServer(t)
	response, body := call(t, server, http.MethodPost, "/api/v1/measurements", `{
		"station_id": "station-01",
		"temperature": -3.7,
		"humidity": 49.3
	}`)
	if response.StatusCode != http.StatusCreated {
		t.Fatalf("status: %d %s", response.StatusCode, body)
	}

	var fields map[string]any
	if err := json.Unmarshal(body, &fields); err != nil {
		t.Fatalf("decode: %v", err)
	}
	for _, name := range []string{"wind_speed", "wind_direction", "co2", "pm25", "pm10"} {
		value, exists := fields[name]
		if !exists || value != nil {
			t.Fatalf("%s should be present and null: %#v", name, value)
		}
	}
	if fields["observed_at"] == nil {
		t.Fatal("observed_at should default to server time")
	}
}

func TestCreateValidation(t *testing.T) {
	server := newTestServer(t)
	valid := func() map[string]any {
		return map[string]any{
			"station_id":  "station-01",
			"temperature": 21.6,
			"humidity":    63.0,
		}
	}

	cases := []struct {
		name   string
		mutate func(map[string]any)
	}{
		{"blank station", func(m map[string]any) { m["station_id"] = "   " }},
		{"long station", func(m map[string]any) { m["station_id"] = strings.Repeat("x", 65) }},
		{"missing temperature", func(m map[string]any) { delete(m, "temperature") }},
		{"missing humidity", func(m map[string]any) { delete(m, "humidity") }},
		{"temperature high", func(m map[string]any) { m["temperature"] = 101 }},
		{"humidity high", func(m map[string]any) { m["humidity"] = 101 }},
		{"wind speed negative", func(m map[string]any) { m["wind_speed"] = -1 }},
		{"wind direction high", func(m map[string]any) { m["wind_direction"] = 361 }},
		{"co2 high", func(m map[string]any) { m["co2"] = 100001 }},
		{"naive time", func(m map[string]any) { m["observed_at"] = "2026-01-01T08:00:00" }},
		{"invalid time", func(m map[string]any) { m["observed_at"] = "not-a-time" }},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			payload := valid()
			testCase.mutate(payload)
			encoded, _ := json.Marshal(payload)
			response, body := call(t, server, http.MethodPost, "/api/v1/measurements", string(encoded))
			if response.StatusCode != http.StatusUnprocessableEntity {
				t.Fatalf("status: %d %s", response.StatusCode, body)
			}
		})
	}

	response, body := call(
		t,
		server,
		http.MethodPost,
		"/api/v1/measurements",
		`{"station_id":"station-01","temperature":NaN,"humidity":63}`,
	)
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("non-finite float status: %d %s", response.StatusCode, body)
	}
}

func TestListFilteringAndPagination(t *testing.T) {
	server := newTestServer(t)
	for _, item := range []struct {
		station string
		time    string
		temp    float64
	}{
		{"station-01", "2026-01-02T10:10:00+08:00", 10},
		{"station-01", "2026-01-02T10:11:00+08:00", 11},
		{"station-01", "2026-01-02T10:12:00+08:00", 12},
		{"station-02", "2026-01-02T11:00:00+08:00", 20},
	} {
		payload, _ := json.Marshal(map[string]any{
			"station_id":  item.station,
			"observed_at": item.time,
			"temperature": item.temp,
			"humidity":    50,
		})
		response, body := call(t, server, http.MethodPost, "/api/v1/measurements", string(payload))
		if response.StatusCode != http.StatusCreated {
			t.Fatalf("seed: %d %s", response.StatusCode, body)
		}
	}

	response, body := call(t, server, http.MethodGet, "/api/v1/measurements?station_id=station-01", "")
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status: %d %s", response.StatusCode, body)
	}
	items := decode[[]measurement.Measurement](t, body)
	if got := []float64{items[0].Temperature, items[1].Temperature, items[2].Temperature}; got[0] != 12 || got[1] != 11 || got[2] != 10 {
		t.Fatalf("unexpected order: %v", got)
	}

	response, body = call(t, server, http.MethodGet, "/api/v1/measurements?station_id=station-01&offset=1&limit=1", "")
	page := decode[[]measurement.Measurement](t, body)
	if response.StatusCode != http.StatusOK || len(page) != 1 || page[0].Temperature != 11 {
		t.Fatalf("pagination: %d %#v", response.StatusCode, page)
	}

	query := url.Values{
		"station_id": {"station-01"},
		"start":      {"2026-01-02T10:11:00+08:00"},
		"end":        {"2026-01-02T10:12:00+08:00"},
	}
	response, body = call(t, server, http.MethodGet, "/api/v1/measurements?"+query.Encode(), "")
	filtered := decode[[]measurement.Measurement](t, body)
	if response.StatusCode != http.StatusOK || len(filtered) != 2 {
		t.Fatalf("filter: %d %#v", response.StatusCode, filtered)
	}

	for _, path := range []string{
		"/api/v1/measurements?limit=0",
		"/api/v1/measurements?limit=1001",
		"/api/v1/measurements?offset=-1",
		"/api/v1/measurements?start=2026-01-02T00:00:00",
		"/api/v1/measurements?start=2026-01-02T00:00:00Z&end=2026-01-01T00:00:00Z",
		"/api/v1/measurements?station_id=" + strings.Repeat("x", 65),
	} {
		response, body := call(t, server, http.MethodGet, path, "")
		if response.StatusCode != http.StatusUnprocessableEntity {
			t.Fatalf("%s: status %d %s", path, response.StatusCode, body)
		}
	}
}

func TestLatest(t *testing.T) {
	server := newTestServer(t)

	response, body := call(t, server, http.MethodGet, "/api/v1/measurements/latest", "")
	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d %s", response.StatusCode, body)
	}

	response, body = call(t, server, http.MethodPost, "/api/v1/measurements", `{
		"station_id":"station-01","temperature":21.6,"humidity":63
	}`)
	if response.StatusCode != http.StatusCreated {
		t.Fatalf("create: %d %s", response.StatusCode, body)
	}

	response, body = call(t, server, http.MethodGet, "/api/v1/measurements/latest?station_id=station-01", "")
	if response.StatusCode != http.StatusOK {
		t.Fatalf("latest: %d %s", response.StatusCode, body)
	}
	latest := decode[measurement.Measurement](t, body)
	if latest.StationID != "station-01" || latest.Temperature != 21.6 {
		t.Fatalf("unexpected latest: %#v", latest)
	}
}

func TestOpenAPIDocsAndRouting(t *testing.T) {
	server := newTestServer(t)

	response, body := call(t, server, http.MethodGet, "/openapi.json", "")
	if response.StatusCode != http.StatusOK {
		t.Fatalf("openapi: %d %s", response.StatusCode, body)
	}
	var document map[string]any
	if err := json.Unmarshal(body, &document); err != nil {
		t.Fatalf("decode openapi: %v", err)
	}
	if document["openapi"] != "3.1.0" {
		t.Fatalf("unexpected openapi version: %#v", document["openapi"])
	}
	paths, ok := document["paths"].(map[string]any)
	if !ok || paths["/api/v1/measurements"] == nil {
		t.Fatalf("missing measurements path")
	}

	response, body = call(t, server, http.MethodGet, "/docs", "")
	if response.StatusCode != http.StatusOK {
		t.Fatalf("docs: %d %s", response.StatusCode, body)
	}

	response, _ = call(t, server, http.MethodGet, "/api/v1/does-not-exist", "")
	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("unknown route: %d", response.StatusCode)
	}
	response, _ = call(t, server, http.MethodDelete, "/api/v1/measurements", "")
	if response.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("delete: %d", response.StatusCode)
	}
}

func TestCORS(t *testing.T) {
	server := newTestServer(t)
	request, _ := http.NewRequest(http.MethodOptions, server.URL+"/api/v1/measurements", nil)
	request.Header.Set("Origin", "http://localhost:5173")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatalf("preflight: %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("preflight status: %d", response.StatusCode)
	}
	if response.Header.Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Fatalf("missing CORS header: %#v", response.Header)
	}

	request, _ = http.NewRequest(http.MethodOptions, server.URL+"/api/v1/measurements", nil)
	request.Header.Set("Origin", "http://not-allowed.example")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	response, err = server.Client().Do(request)
	if err != nil {
		t.Fatalf("disallowed preflight: %v", err)
	}
	defer response.Body.Close()
	if response.Header.Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("disallowed origin received CORS header")
	}
}

type failingPinger struct{}

func (failingPinger) Ping(context.Context) error {
	return context.DeadlineExceeded
}

package measurement

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

type fakeRepository struct {
	created    Measurement
	createdErr error
	listFilter ListInput
	listErr    error
	latest     Measurement
	latestErr  error
	latestID   string
}

func (f *fakeRepository) Create(_ context.Context, item Measurement) (Measurement, error) {
	f.created = item
	if f.createdErr != nil {
		return Measurement{}, f.createdErr
	}
	item.ID = 1
	return item, nil
}

func (f *fakeRepository) List(_ context.Context, filter ListInput) ([]Measurement, error) {
	f.listFilter = filter
	return nil, f.listErr
}

func (f *fakeRepository) Latest(_ context.Context, stationID string) (Measurement, error) {
	f.latestID = stationID
	return f.latest, f.latestErr
}

func (f *fakeRepository) Ping(_ context.Context) error { return nil }

func TestCreateTrimsStationAndUsesServerTime(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	fixed := time.Date(2026, 11, 4, 8, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return fixed }

	item, err := service.Create(context.Background(), CreateInput{
		StationID:   "  station-01  ",
		Temperature: 21.6,
		Humidity:    63,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if item.StationID != "station-01" {
		t.Fatalf("unexpected station: %q", item.StationID)
	}
	if !item.ObservedAt.Equal(fixed) || !item.ReceivedAt.Equal(fixed) {
		t.Fatalf("unexpected timestamps: %v %v", item.ObservedAt, item.ReceivedAt)
	}
}

func TestCreateRejectsBlankAndLongStation(t *testing.T) {
	service := NewService(&fakeRepository{})

	if _, err := service.Create(context.Background(), CreateInput{
		StationID: "   ", Temperature: 20, Humidity: 50,
	}); err == nil {
		t.Fatal("expected blank station error")
	}

	if _, err := service.Create(context.Background(), CreateInput{
		StationID: strings.Repeat("x", 65), Temperature: 20, Humidity: 50,
	}); err == nil {
		t.Fatal("expected long station error")
	}
}

func TestCreateKeepsObservedAtInUTC(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	observed := time.Date(2026, 11, 4, 16, 0, 0, 0, time.FixedZone("CST", 8*3600))

	if _, err := service.Create(context.Background(), CreateInput{
		StationID:   "station-01",
		ObservedAt:  &observed,
		Temperature: 20,
		Humidity:    50,
	}); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if got := repo.created.ObservedAt.Format(time.RFC3339); got != "2026-11-04T08:00:00Z" {
		t.Fatalf("unexpected observed_at: %s", got)
	}
}

func TestListValidatesBoundsAndTimeRange(t *testing.T) {
	service := NewService(&fakeRepository{})
	start := time.Date(2026, 11, 4, 9, 0, 0, 0, time.UTC)
	end := time.Date(2026, 11, 4, 8, 0, 0, 0, time.UTC)

	if _, err := service.List(context.Background(), ListInput{Limit: 0}); err == nil {
		t.Fatal("expected limit error")
	}
	if _, err := service.List(context.Background(), ListInput{
		Limit: 10, Start: &start, End: &end,
	}); err == nil {
		t.Fatal("expected start after end error")
	}
}

func TestListPassesTrimmedStationAndFilter(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	start := time.Date(2026, 11, 4, 8, 0, 0, 0, time.UTC)

	if _, err := service.List(context.Background(), ListInput{
		StationID: "  station-01 ",
		Start:     &start,
		Offset:    2,
		Limit:     25,
	}); err != nil {
		t.Fatalf("List: %v", err)
	}
	if repo.listFilter.StationID != "station-01" ||
		repo.listFilter.Offset != 2 ||
		repo.listFilter.Limit != 25 {
		t.Fatalf("unexpected filter: %#v", repo.listFilter)
	}
}

func TestLatestTrimsStationAndPropagatesNotFound(t *testing.T) {
	repo := &fakeRepository{latestErr: ErrNotFound}
	service := NewService(repo)

	if _, err := service.Latest(context.Background(), " station-01 "); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
	if repo.latestID != "station-01" {
		t.Fatalf("unexpected station: %q", repo.latestID)
	}
}

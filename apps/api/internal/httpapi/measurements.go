package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/danielgtaylor/huma/v2"

	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/measurement"
)

const maxStationIDLength = 64

type measurementBody struct {
	StationID     string     `json:"station_id" minLength:"1" maxLength:"64" doc:"监测站标识"`
	ObservedAt    *time.Time `json:"observed_at" required:"false" doc:"采集时间，必须带时区；省略时使用服务器时间"`
	WindSpeed     *float64   `json:"wind_speed" required:"false" minimum:"0" maximum:"100" doc:"风速 m/s"`
	WindDirection *float64   `json:"wind_direction" required:"false" minimum:"0" maximum:"360" doc:"风向 度"`
	Temperature   float64    `json:"temperature" minimum:"-100" maximum:"100" doc:"温度 °C"`
	Humidity      float64    `json:"humidity" minimum:"0" maximum:"100" doc:"湿度 %"`
	CO2           *float64   `json:"co2" required:"false" minimum:"0" maximum:"100000" doc:"二氧化碳 ppm"`
	PM25          *float64   `json:"pm25" required:"false" minimum:"0" maximum:"10000" doc:"PM2.5 μg/m³"`
	PM10          *float64   `json:"pm10" required:"false" minimum:"0" maximum:"10000" doc:"PM10 μg/m³"`
	Latitude      *float64   `json:"latitude" required:"false" minimum:"-90" maximum:"90" doc:"设备纬度"`
	Longitude     *float64   `json:"longitude" required:"false" minimum:"-180" maximum:"180" doc:"设备经度"`
}

type createInput struct {
	Body measurementBody
}

type createOutput struct {
	Body measurement.Measurement
}

type listInput struct {
	StationID string `query:"station_id" maxLength:"64" doc:"按站点筛选"`
	Start     string `query:"start" format:"date-time" doc:"起始时间，必须带时区"`
	End       string `query:"end" format:"date-time" doc:"结束时间，必须带时区"`
	Offset    int    `query:"offset" default:"0" minimum:"0" doc:"跳过条数"`
	Limit     int    `query:"limit" default:"100" minimum:"1" maximum:"1000" doc:"返回条数"`
}

type listOutput struct {
	Body []measurement.Measurement
}

type latestInput struct {
	StationID string `query:"station_id" maxLength:"64" doc:"按站点筛选"`
}

type latestOutput struct {
	Body measurement.Measurement
}

func registerMeasurements(api huma.API, service *measurement.Service, logger *slog.Logger) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-measurement",
		Method:        http.MethodPost,
		Path:          "/api/v1/measurements",
		Summary:       "上报测量数据",
		Tags:          []string{"measurements"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *createInput) (*createOutput, error) {
		result, err := service.Create(ctx, measurement.CreateInput{
			StationID:     input.Body.StationID,
			ObservedAt:    input.Body.ObservedAt,
			WindSpeed:     input.Body.WindSpeed,
			WindDirection: input.Body.WindDirection,
			Temperature:   input.Body.Temperature,
			Humidity:      input.Body.Humidity,
			CO2:           input.Body.CO2,
			PM25:          input.Body.PM25,
			PM10:          input.Body.PM10,
			Latitude:      input.Body.Latitude,
			Longitude:     input.Body.Longitude,
		})
		if err != nil {
			return nil, serviceError(err, logger)
		}
		return &createOutput{Body: result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-measurements",
		Method:      http.MethodGet,
		Path:        "/api/v1/measurements",
		Summary:     "查询历史测量数据",
		Tags:        []string{"measurements"},
	}, func(ctx context.Context, input *listInput) (*listOutput, error) {
		stationID, err := queryStationID(input.StationID)
		if err != nil {
			return nil, serviceError(err, logger)
		}
		start, err := queryTime(input.Start, "start")
		if err != nil {
			return nil, serviceError(err, logger)
		}
		end, err := queryTime(input.End, "end")
		if err != nil {
			return nil, serviceError(err, logger)
		}
		items, err := service.List(ctx, measurement.ListInput{
			StationID: stationID,
			Start:     start,
			End:       end,
			Offset:    input.Offset,
			Limit:     input.Limit,
		})
		if err != nil {
			return nil, serviceError(err, logger)
		}
		return &listOutput{Body: items}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "latest-measurement",
		Method:      http.MethodGet,
		Path:        "/api/v1/measurements/latest",
		Summary:     "查询最新测量数据",
		Tags:        []string{"measurements"},
	}, func(ctx context.Context, input *latestInput) (*latestOutput, error) {
		stationID, err := queryStationID(input.StationID)
		if err != nil {
			return nil, serviceError(err, logger)
		}
		result, err := service.Latest(ctx, stationID)
		if errors.Is(err, measurement.ErrNotFound) {
			return nil, huma.Error404NotFound("No measurement found")
		}
		if err != nil {
			return nil, serviceError(err, logger)
		}
		return &latestOutput{Body: result}, nil
	})
}

func queryStationID(value string) (string, error) {
	stationID := strings.TrimSpace(value)
	if stationID == "" {
		return "", nil
	}
	if utf8.RuneCountInString(stationID) > maxStationIDLength {
		return "", &measurement.ValidationError{
			Field:   "station_id",
			Message: "must be at most 64 characters",
		}
	}
	return stationID, nil
}

func queryTime(value, field string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, &measurement.ValidationError{
			Field:   field,
			Message: "must be an RFC 3339 timestamp with timezone",
		}
	}
	utc := parsed.UTC()
	return &utc, nil
}

func serviceError(err error, logger *slog.Logger) error {
	var validation *measurement.ValidationError
	if errors.As(err, &validation) {
		return huma.Error422UnprocessableEntity(validation.Error())
	}
	logger.Error("request failed", "error", err)
	return huma.Error500InternalServerError("internal server error")
}

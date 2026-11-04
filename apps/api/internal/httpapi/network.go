package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/the9thphoto/MicroclimateMonitoring-Server/apps/api/internal/measurement"
)

type framesInput struct {
	Start string `query:"start" required:"true" format:"date-time" doc:"起始时间，必须带时区"`
	End   string `query:"end" required:"true" format:"date-time" doc:"结束时间，必须带时区"`
	Step  int    `query:"step" default:"300" minimum:"60" maximum:"3600" doc:"时间桶秒数"`
}

type framesOutput struct {
	Body measurement.FramesResponse
}

func registerFrames(api huma.API, service *measurement.Service, logger *slog.Logger) {
	huma.Register(api, huma.Operation{
		OperationID: "network-frames",
		Method:      http.MethodGet,
		Path:        "/api/v1/network/frames",
		Summary:     "查询全网时间帧",
		Tags:        []string{"measurements"},
	}, func(ctx context.Context, input *framesInput) (*framesOutput, error) {
		start, err := queryTime(input.Start, "start")
		if err != nil {
			return nil, serviceError(err, logger)
		}
		end, err := queryTime(input.End, "end")
		if err != nil {
			return nil, serviceError(err, logger)
		}
		if start == nil || end == nil {
			return nil, huma.Error422UnprocessableEntity("start and end are required")
		}
		step := time.Duration(input.Step) * time.Second
		frames, err := service.Frames(ctx, *start, *end, step)
		if err != nil {
			return nil, serviceError(err, logger)
		}
		return &framesOutput{Body: measurement.FramesResponse{
			Start:  start.UTC(),
			End:    end.UTC(),
			Step:   input.Step,
			Frames: frames,
		}}, nil
	})
}

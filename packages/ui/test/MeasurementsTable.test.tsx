import type { components } from "@microclimate/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MeasurementsTable } from "../src/MeasurementsTable";

type Measurement = components["schemas"]["Measurement"];

const rows: Measurement[] = [
  {
    id: 2,
    station_id: "station-01",
    observed_at: "2026-11-04T01:00:00Z",
    received_at: "2026-11-04T01:00:01Z",
    wind_speed: null,
    wind_direction: null,
    temperature: 22.5,
    humidity: 60,
    co2: null,
    pm25: null,
    pm10: null,
  },
  {
    id: 1,
    station_id: "station-01",
    observed_at: "2026-11-04T00:00:00Z",
    received_at: "2026-11-04T00:00:01Z",
    wind_speed: null,
    wind_direction: null,
    temperature: 21,
    humidity: 61,
    co2: null,
    pm25: null,
    pm10: null,
  },
];

describe("MeasurementsTable", () => {
  it("renders one row per measurement", () => {
    render(<MeasurementsTable rows={rows} />);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("22.5")).toBeInTheDocument();
    expect(screen.getByText("21.0")).toBeInTheDocument();
  });
});

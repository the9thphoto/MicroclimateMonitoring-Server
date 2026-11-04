import type { components } from "@microclimate/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricGrid } from "../src/MetricGrid";

type Measurement = components["schemas"]["Measurement"];

const measurement: Measurement = {
  id: 1,
  station_id: "station-01",
  observed_at: "2026-11-04T00:30:00Z",
  received_at: "2026-11-04T00:30:01Z",
  wind_speed: null,
  wind_direction: null,
  temperature: 21.6,
  humidity: 63.4,
  co2: null,
  pm25: 18,
  pm10: 34,
};

describe("MetricGrid", () => {
  it("shows measured values and dashes for missing sensors", () => {
    render(<MetricGrid measurement={measurement} />);

    expect(screen.getByText("21.6")).toBeInTheDocument();
    expect(screen.getByText("63.4")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("shows dashes without a measurement", () => {
    render(<MetricGrid measurement={null} />);
    expect(screen.getAllByText("—")).toHaveLength(7);
  });
});

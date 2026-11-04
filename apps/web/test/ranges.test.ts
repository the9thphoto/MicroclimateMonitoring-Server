import type { Measurement } from "@microclimate/api-client";
import { describe, expect, it } from "vitest";

import { rangeWindow, toChartPoints } from "../src/lib/ranges";

function measurement(id: number, observedAt: string): Measurement {
  return {
    id,
    station_id: "station-01",
    observed_at: observedAt,
    received_at: observedAt,
    wind_speed: null,
    wind_direction: null,
    temperature: id,
    humidity: 50,
    co2: null,
    pm25: null,
    pm10: null,
  };
}

describe("rangeWindow", () => {
  it("subtracts the selected duration from the end", () => {
    const now = new Date("2026-11-04T08:00:00Z");
    const { start, end } = rangeWindow("1h", now);
    expect(end.toISOString()).toBe("2026-11-04T08:00:00.000Z");
    expect(start.toISOString()).toBe("2026-11-04T07:00:00.000Z");
  });
});

describe("toChartPoints", () => {
  it("orders points oldest first", () => {
    const points = toChartPoints([
      measurement(2, "2026-11-04T02:00:00Z"),
      measurement(1, "2026-11-04T01:00:00Z"),
    ]);
    expect(points.map((point) => point.temperature)).toEqual([1, 2]);
  });

  it("keeps the chart payload bounded", () => {
    const rows = Array.from({ length: 1000 }, (_, index) =>
      measurement(index, new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()),
    );
    expect(toChartPoints(rows).length).toBeLessThanOrEqual(361);
  });

  it("returns nothing for an empty range", () => {
    expect(toChartPoints([])).toEqual([]);
  });
});

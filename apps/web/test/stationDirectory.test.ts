import type { Measurement } from "@microclimate/api-client";
import { describe, expect, it } from "vitest";

import { groupLatestByStation } from "../src/lib/stationDirectory";

function measurement(stationId: string, observedAt: string, temperature: number): Measurement {
  return {
    id: temperature,
    station_id: stationId,
    observed_at: observedAt,
    received_at: observedAt,
    wind_speed: null,
    wind_direction: null,
    temperature,
    humidity: 50,
    co2: null,
    pm25: null,
    pm10: null,
  };
}

describe("groupLatestByStation", () => {
  it("keeps the newest row per station", () => {
    const grouped = groupLatestByStation([
      measurement("station-b", "2026-11-04T10:02:00Z", 22),
      measurement("station-a", "2026-11-04T10:01:00Z", 21),
      measurement("station-b", "2026-11-04T10:00:00Z", 20),
    ]);
    expect(grouped.map((item) => item.stationId)).toEqual(["station-a", "station-b"]);
    expect(grouped[1]?.latest.temperature).toBe(22);
  });

  it("returns an empty list without rows", () => {
    expect(groupLatestByStation([])).toEqual([]);
  });
});

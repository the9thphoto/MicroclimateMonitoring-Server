import type { Measurement } from "@microclimate/api-client";
import { describe, expect, it } from "vitest";
import { measurementLocation } from "../src/lib/location";
import {
  buildNetworkStations,
  latestNetworkTime,
  networkAvailability,
  unlocatedCount,
  visibleNetworkStations,
} from "../src/lib/network";

function measurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: 1,
    station_id: "station-01",
    observed_at: "2026-11-04T07:11:18.484Z",
    received_at: "2026-11-04T07:11:18.702Z",
    wind_speed: null,
    wind_direction: null,
    temperature: 21.5,
    humidity: 53.5,
    co2: null,
    pm25: null,
    pm10: null,
    latitude: 32.0839058,
    longitude: 118.6361144,
    ...overrides,
  };
}

describe("network stations", () => {
  it("builds visible and unlocated stations from latest measurements", () => {
    const located = {
      stationId: "station-01",
      latest: measurement(),
      location: measurementLocation(measurement()),
    };
    const unlocated = {
      stationId: "station-02",
      latest: measurement({ station_id: "station-02", latitude: null }),
      location: null,
    };
    const stations = buildNetworkStations([located, unlocated], 24 * 60 * 60 * 1000);

    expect(stations).toHaveLength(2);
    expect(visibleNetworkStations(stations)).toHaveLength(1);
    expect(unlocatedCount(stations)).toBe(1);
    expect(latestNetworkTime(stations)).toBe("2026-11-04T07:11:18.484Z");
  });

  it("enables layers based on the whole network", () => {
    const station = buildNetworkStations(
      [
        {
          stationId: "station-01",
          latest: measurement(),
          location: measurementLocation(measurement()),
        },
      ],
      24 * 60 * 60 * 1000,
    )[0];
    const availability = networkAvailability(station ? [station] : []);
    expect(availability.temperature).toBe(true);
    expect(availability.humidity).toBe(true);
    expect(availability.windSpeed).toBe(false);
    expect(availability.aqi).toBe(false);
  });
});

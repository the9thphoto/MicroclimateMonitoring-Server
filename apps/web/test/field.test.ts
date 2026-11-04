import type { Measurement } from "@microclimate/api-client";
import { describe, expect, it } from "vitest";

import { buildTemperatureField, convexHull, idwValue, pointInHull } from "../src/lib/field";
import type { NetworkStation } from "../src/lib/network";

function station(
  id: string,
  latitude: number,
  longitude: number,
  temperature: number,
): NetworkStation {
  const latest: Measurement = {
    id: 1,
    station_id: id,
    observed_at: "2026-11-04T11:04:30.000Z",
    received_at: "2026-11-04T11:04:30.100Z",
    wind_speed: null,
    wind_direction: null,
    temperature,
    humidity: 55,
    co2: null,
    pm25: null,
    pm10: null,
    latitude,
    longitude,
  };
  return {
    stationId: id,
    latest,
    location: { latitude, longitude },
    point: {
      time: 0,
      label: "",
      fullLabel: "",
      temperature,
      humidity: 55,
      dewPoint: null,
      thi: null,
      windSpeed: null,
      windDirection: null,
      co2: null,
      pm25: null,
      pm10: null,
      aqi: null,
    },
  };
}

describe("temperature field", () => {
  it("interpolates between stations and returns null outside coverage", () => {
    const points = [
      { latitude: 32, longitude: 118.6, value: 20 },
      { latitude: 32.1, longitude: 118.6, value: 24 },
    ];
    expect(idwValue(points, 32.05, 118.6, 0.2)).toBeCloseTo(22, 5);
    expect(idwValue(points, 33, 119, 0.2)).toBeNull();
  });

  it("builds a hull and masks points outside it", () => {
    const hull = convexHull([
      { latitude: 32, longitude: 118.6 },
      { latitude: 32.1, longitude: 118.6 },
      { latitude: 32.05, longitude: 118.7 },
    ]);
    expect(hull).toHaveLength(3);
    expect(pointInHull(32.05, 118.63, hull)).toBe(true);
    expect(pointInHull(32.2, 118.63, hull)).toBe(false);
  });

  it("requires at least three located stations", () => {
    expect(
      buildTemperatureField([station("a", 32, 118.6, 20), station("b", 32.1, 118.6, 24)]),
    ).toBeNull();
    const field = buildTemperatureField([
      station("a", 32, 118.6, 20),
      station("b", 32.1, 118.6, 24),
      station("c", 32.05, 118.7, 22),
    ]);
    expect(field).not.toBeNull();
    expect(field?.stationCount).toBe(3);
    expect(field?.domain[0]).toBeLessThan(20);
    expect(field?.domain[1]).toBeGreaterThan(24);
    expect(field?.values.some((value) => Number.isFinite(value))).toBe(true);
    expect(field?.alpha.some((value) => value > 0)).toBe(true);
  });
});

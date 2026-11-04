import { describe, expect, it } from "vitest";
import type { AnalysisPoint } from "../src/lib/analysis";

import { formatLayerValue, isLayerId, LAYERS, layerById, layerColor } from "../src/lib/layers";

function point(overrides: Partial<AnalysisPoint> = {}): AnalysisPoint {
  return {
    time: 0,
    label: "",
    fullLabel: "",
    temperature: 20,
    humidity: 50,
    dewPoint: 9,
    thi: 20,
    windSpeed: null,
    windDirection: null,
    co2: null,
    pm25: null,
    pm10: null,
    aqi: null,
    ...overrides,
  };
}

describe("layers", () => {
  it("resolves known layers and falls back safely", () => {
    expect(layerById("humidity").id).toBe("humidity");
    expect(layerById("missing").id).toBe("temperature");
    expect(isLayerId("aqi")).toBe(true);
    expect(isLayerId("forecast")).toBe(false);
  });

  it("formats values with units and missing data", () => {
    expect(formatLayerValue(layerById("temperature"), 21.64)).toBe("21.6 °C");
    expect(formatLayerValue(layerById("temperature"), null)).toBe("—");
    expect(formatLayerValue(layerById("aqi"), 42)).toBe("42 AQI");
  });

  it("maps values into the layer color scale", () => {
    const temperature = layerById("temperature");
    expect(temperature.domain).toEqual([-20, 45]);
    expect(temperature.stops).toHaveLength(11);
    expect(layerColor(temperature, -100)).toBe(temperature.stops[0]);
    expect(layerColor(temperature, 100)).toBe(temperature.stops[temperature.stops.length - 1]);
    expect(layerColor(temperature, null)).toBe("#94a3b8");
  });

  it("reports availability from observed values", () => {
    const temperature = LAYERS.find((layer) => layer.id === "temperature");
    const wind = LAYERS.find((layer) => layer.id === "windSpeed");
    expect(temperature?.available([point()])).toBe(true);
    expect(wind?.available([point()])).toBe(false);
    expect(wind?.available([point({ windSpeed: 2.4 })])).toBe(true);
  });
});

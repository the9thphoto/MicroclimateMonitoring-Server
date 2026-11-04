import type { Measurement } from "@microclimate/api-client";
import { describe, expect, it } from "vitest";

import {
  type AnalysisPoint,
  absoluteHumidity,
  ageLabel,
  airQualityFromAqi,
  aqiFromParticulates,
  beaufort,
  buildHeatmap,
  comfortFromThi,
  correlationMatrix,
  dataQuality,
  dewPoint,
  diurnalInsight,
  environmentSnapshot,
  hourlyBoxPlot,
  hourlyProfile,
  summarizeMetric,
  thi,
  toAnalysisPoints,
  windDirectionLabel,
  windRose,
} from "../src/lib/analysis";

function measurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: 1,
    station_id: "station-01",
    observed_at: "2026-11-04T00:00:00Z",
    received_at: "2026-11-04T00:00:01Z",
    wind_speed: null,
    wind_direction: null,
    temperature: 20,
    humidity: 50,
    co2: null,
    pm25: null,
    pm10: null,
    ...overrides,
  };
}

function point(time: number, temperature: number, humidity: number): AnalysisPoint {
  return {
    time,
    label: "",
    fullLabel: "",
    temperature,
    humidity,
    dewPoint: dewPoint(temperature, humidity),
    thi: thi(temperature, humidity),
    windSpeed: null,
    co2: null,
    pm25: null,
    pm10: null,
    aqi: null,
  };
}

describe("meteorological derivations", () => {
  it("computes dew point from temperature and relative humidity", () => {
    expect(dewPoint(20, 50)).toBeCloseTo(9.3, 1);
  });

  it("computes the temperature-humidity index and comfort category", () => {
    const value = thi(25, 60);
    expect(value).toBeCloseTo(22.7, 1);
    expect(comfortFromThi(value).label).toBe("舒适");
    expect(comfortFromThi(5).label).toBe("寒冷");
    expect(comfortFromThi(35).label).toBe("酷热");
  });

  it("computes absolute humidity", () => {
    expect(absoluteHumidity(20, 50)).toBeCloseTo(8.6, 1);
  });

  it("classifies wind speed and direction", () => {
    expect(beaufort(0)?.label).toBe("无风");
    expect(beaufort(3.4)?.level).toBe(3);
    expect(beaufort(null)).toBeNull();
    expect(windDirectionLabel(0)).toBe("北");
    expect(windDirectionLabel(90)).toBe("东");
    expect(windDirectionLabel(225)).toBe("西南");
  });

  it("converts particulate concentrations into a reference AQI", () => {
    expect(aqiFromParticulates(35, null)).toBe(50);
    expect(aqiFromParticulates(75, 150)).toBe(100);
    expect(aqiFromParticulates(null, null)).toBeNull();
    expect(airQualityFromAqi(120).label).toBe("轻度污染");
  });
});

describe("analysis points", () => {
  it("orders rows oldest first and labels multi-day ranges with dates", () => {
    const older = measurement({
      observed_at: new Date(2026, 10, 4, 10, 0).toISOString(),
      temperature: 20,
    });
    const newer = measurement({
      observed_at: new Date(2026, 10, 4, 10, 30).toISOString(),
      temperature: 22,
    });
    const points = toAnalysisPoints([newer, older], 7 * 24 * 60 * 60 * 1000);
    expect(points.map((item) => item.temperature)).toEqual([20, 22]);
    expect(points[0]?.label).toBe("11/04 10:00");
  });

  it("keeps the chart payload bounded", () => {
    const rows = Array.from({ length: 1000 }, (_, index) =>
      measurement({
        observed_at: new Date(2026, 10, 4, 10, 0, index).toISOString(),
        temperature: index,
      }),
    );
    expect(toAnalysisPoints(rows, 0).length).toBeLessThanOrEqual(361);
    expect(toAnalysisPoints([], 0)).toEqual([]);
  });

  it("summarizes minimum, maximum, average and change", () => {
    const points = [point(1, 20, 50), point(2, 22, 60), point(3, 24, 70)];
    const summary = summarizeMetric(points, "temperature");
    expect(summary).toMatchObject({
      count: 3,
      min: 20,
      max: 24,
      avg: 22,
      change: 4,
    });
    expect(summarizeMetric([], "temperature")).toBeNull();
  });

  it("aggregates by local hour and reports diurnal extremes", () => {
    const points = [
      point(new Date(2026, 10, 4, 10, 0).getTime(), 20, 50),
      point(new Date(2026, 10, 4, 10, 30).getTime(), 22, 60),
      point(new Date(2026, 10, 4, 11, 0).getTime(), 24, 70),
    ];
    const profile = hourlyProfile(points);
    expect(profile).toHaveLength(2);
    expect(profile[0]).toMatchObject({ hour: 10, temperature: 21, humidity: 55, count: 2 });
    const insight = diurnalInsight(profile);
    expect(insight?.warmest.hour).toBe(11);
    expect(insight?.coolest.hour).toBe(10);
    expect(insight?.mostHumid.hour).toBe(11);
  });
});

describe("research visualizations", () => {
  it("builds a day by hour heatmap without interpolating gaps", () => {
    const points = [
      point(new Date(2026, 10, 4, 10, 0).getTime(), 20, 50),
      point(new Date(2026, 10, 5, 11, 0).getTime(), 24, 60),
    ];
    const heatmap = buildHeatmap(points, "temperature");
    expect(heatmap.days).toHaveLength(2);
    expect(heatmap.cells).toHaveLength(48);
    expect(heatmap.cells.find((cell) => cell.hour === 10 && cell.value !== null)?.value).toBe(20);
    expect(heatmap.cells.find((cell) => cell.hour === 12 && cell.value === null)?.value).toBeNull();
    expect(heatmap.min).toBe(20);
    expect(heatmap.max).toBe(24);
  });

  it("groups wind observations into eight sectors", () => {
    const bins = windRose([
      measurement({ wind_speed: 2, wind_direction: 0 }),
      measurement({ wind_speed: 4, wind_direction: 10 }),
      measurement({ wind_speed: 6, wind_direction: 90 }),
      measurement({ wind_speed: 8, wind_direction: 200 }),
    ]);
    expect(bins).not.toBeNull();
    expect(bins?.[0]).toMatchObject({ label: "北", count: 2, averageSpeed: 3, maxSpeed: 4 });
    expect(bins?.[2]?.count).toBe(1);
    expect(bins?.[4]?.count).toBe(1);
    expect(windRose([measurement()])).toBeNull();
  });

  it("computes hour-of-day box plot statistics", () => {
    const points = [0, 10, 20, 30].map((minute, index) =>
      point(new Date(2026, 10, 4, 10, minute).getTime(), index + 1, 50),
    );
    const hours = hourlyBoxPlot(points, "temperature");
    expect(hours).toHaveLength(1);
    expect(hours[0]).toMatchObject({ hour: 10, min: 1, max: 4, median: 2.5, count: 4 });
    expect(hours[0]?.q1).toBeCloseTo(1.75, 5);
    expect(hours[0]?.q3).toBeCloseTo(3.25, 5);
  });

  it("computes a Pearson correlation matrix", () => {
    const points = [1, 2, 3].map((value, index) => point(index, value, [30, 20, 10][index] ?? 0));
    const matrix = correlationMatrix(points);
    const temperatureIndex = matrix.metrics.findIndex((metric) => metric.key === "temperature");
    const humidityIndex = matrix.metrics.findIndex((metric) => metric.key === "humidity");
    expect(matrix.values[temperatureIndex]?.[humidityIndex]).toBeCloseTo(-1, 5);
    expect(matrix.values[0]?.[0]).toBe(1);
  });
});

describe("data quality and environment", () => {
  it("estimates coverage and gaps", () => {
    const rows = [
      measurement({ observed_at: new Date(2026, 10, 4, 10, 0).toISOString() }),
      measurement({ observed_at: new Date(2026, 10, 4, 10, 1).toISOString() }),
      measurement({ observed_at: new Date(2026, 10, 4, 10, 6).toISOString() }),
    ];
    const quality = dataQuality(rows, 10 * 60 * 1000);
    expect(quality.count).toBe(3);
    expect(quality.expected).toBe(10);
    expect(quality.coverage).toBeCloseTo(0.3, 5);
    expect(quality.gaps).toBe(1);
    expect(quality.maxGapMinutes).toBe(5);
  });

  it("aggregates available sensors and keeps missing values null", () => {
    const rows = [
      measurement({
        observed_at: new Date(2026, 10, 4, 10, 0).toISOString(),
        wind_speed: 2,
        wind_direction: 90,
        pm25: 35,
        pm10: 50,
        co2: 700,
      }),
      measurement({
        observed_at: new Date(2026, 10, 4, 10, 1).toISOString(),
        wind_speed: 4,
        wind_direction: 100,
        pm25: 75,
        pm10: 150,
        co2: 900,
      }),
    ];
    const environment = environmentSnapshot(rows);
    expect(environment.wind).toMatchObject({ averageSpeed: 3, maxSpeed: 4, directionLabel: "东" });
    expect(environment.air?.quality.label).toBe("良");
    expect(environment.co2).toMatchObject({ average: 800, max: 900, level: "正常" });
    expect(environment.sensors).toEqual({ wind: true, co2: true, particulates: true });
    expect(environmentSnapshot([measurement()]).wind).toBeNull();
  });

  it("formats data age", () => {
    const now = Date.UTC(2026, 10, 4, 10, 0, 0);
    expect(ageLabel(new Date(now - 30_000).toISOString(), now)).toBe("刚刚");
    expect(ageLabel(new Date(now - 5 * 60_000).toISOString(), now)).toBe("5 分钟前");
    expect(ageLabel(new Date(now - 2 * 3_600_000).toISOString(), now)).toBe("2 小时前");
    expect(ageLabel(null, now)).toBe("—");
  });
});

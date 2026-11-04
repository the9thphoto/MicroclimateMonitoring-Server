import type { Measurement, NetworkFrames } from "@microclimate/api-client";

import { type AnalysisPoint, dewPoint, thi, toAnalysisPoints } from "./analysis";
import { measurementLocation } from "./location";
import type { NetworkStation } from "./network";
import type { RangeKey } from "./ranges";

export interface NetworkFrame {
  time: number;
  label: string;
  fullLabel: string;
  stations: NetworkStation[];
  average: AnalysisPoint;
}

export const NETWORK_STEPS: Record<RangeKey, number> = {
  "1h": 60,
  "6h": 60,
  "24h": 300,
  "7d": 1800,
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function frameLabel(value: string): { time: number; label: string; fullLabel: string } {
  const date = new Date(value);
  const time = date.getTime();
  return {
    time,
    label: date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    fullLabel: date.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function buildNetworkFrames(response: NetworkFrames, rangeMs: number): NetworkFrame[] {
  const last = new Map<string, Measurement>();
  const frames: NetworkFrame[] = [];
  for (const frame of response.frames ?? []) {
    for (const measurement of frame.stations ?? []) {
      if (measurementLocation(measurement)) {
        last.set(measurement.station_id, measurement);
      }
    }
    const stations: NetworkStation[] = [];
    for (const measurement of last.values()) {
      const location = measurementLocation(measurement);
      const point = toAnalysisPoints([measurement], rangeMs, 1)[0];
      if (location && point) {
        stations.push({
          stationId: measurement.station_id,
          latest: measurement,
          location,
          point,
        });
      }
    }
    const time = frameLabel(frame.time);
    const temperatures = stations
      .map((station) => station.point.temperature)
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const humidities = stations
      .map((station) => station.point.humidity)
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const avgTemperature = average(temperatures);
    const avgHumidity = average(humidities);
    const averagePoint: AnalysisPoint = {
      ...time,
      temperature: avgTemperature,
      humidity: avgHumidity,
      dewPoint:
        avgTemperature !== null && avgHumidity !== null
          ? dewPoint(avgTemperature, avgHumidity)
          : null,
      thi:
        avgTemperature !== null && avgHumidity !== null ? thi(avgTemperature, avgHumidity) : null,
      windSpeed: null,
      windDirection: null,
      co2: null,
      pm25: null,
      pm10: null,
      aqi: null,
    };
    frames.push({ ...time, stations, average: averagePoint });
  }
  return frames;
}

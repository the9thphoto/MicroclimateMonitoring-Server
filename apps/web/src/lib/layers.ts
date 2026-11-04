import type { AnalysisPoint } from "./analysis";
import { colorForValue, formatNumber } from "./colors";

export type LayerId = "temperature" | "humidity" | "thi" | "windSpeed" | "aqi";

export interface LayerDefinition {
  id: LayerId;
  label: string;
  shortLabel: string;
  unit: string;
  digits: number;
  domain: [number, number];
  stops: string[];
  valueOf: (point: AnalysisPoint) => number | null;
  available: (points: AnalysisPoint[]) => boolean;
}

function hasValue(points: AnalysisPoint[], read: (point: AnalysisPoint) => number | null): boolean {
  return points.some((point) => {
    const value = read(point);
    return value !== null && Number.isFinite(value);
  });
}

export const LAYERS: LayerDefinition[] = [
  {
    id: "temperature",
    label: "温度",
    shortLabel: "温度",
    unit: "°C",
    digits: 1,
    domain: [-20, 45],
    stops: [
      "#042333",
      "#10326c",
      "#40349f",
      "#674396",
      "#8b538d",
      "#b15f82",
      "#d66c6c",
      "#f2814e",
      "#fca63c",
      "#f7d045",
      "#e8fa5b",
    ],
    valueOf: (point) => point.temperature,
    available: (points) => hasValue(points, (point) => point.temperature),
  },
  {
    id: "humidity",
    label: "相对湿度",
    shortLabel: "湿度",
    unit: "%",
    digits: 0,
    domain: [0, 100],
    stops: ["#d97706", "#fbbf24", "#a3e635", "#34d399", "#22d3ee", "#2563eb"],
    valueOf: (point) => point.humidity,
    available: (points) => hasValue(points, (point) => point.humidity),
  },
  {
    id: "thi",
    label: "温湿指数",
    shortLabel: "体感",
    unit: "",
    digits: 1,
    domain: [0, 40],
    stops: ["#38bdf8", "#22d3ee", "#10b981", "#f59e0b", "#f97316", "#ef4444"],
    valueOf: (point) => point.thi,
    available: (points) => hasValue(points, (point) => point.thi),
  },
  {
    id: "windSpeed",
    label: "风速",
    shortLabel: "风",
    unit: "m/s",
    digits: 1,
    domain: [0, 15],
    stops: ["#bae6fd", "#67e8f9", "#22d3ee", "#818cf8", "#a855f7"],
    valueOf: (point) => point.windSpeed,
    available: (points) => hasValue(points, (point) => point.windSpeed),
  },
  {
    id: "aqi",
    label: "空气质量",
    shortLabel: "空气",
    unit: "AQI",
    digits: 0,
    domain: [0, 300],
    stops: ["#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7", "#9f1239"],
    valueOf: (point) => point.aqi,
    available: (points) => hasValue(points, (point) => point.aqi),
  },
];

export const DEFAULT_LAYER: LayerId = "temperature";

/** Fixed temperature ticks keep the scale comparable between screenshots. */
export const TEMPERATURE_TICKS = [-20, -10, 0, 10, 20, 30, 40];

export function isLayerId(value: string | null | undefined): value is LayerId {
  return LAYERS.some((layer) => layer.id === value);
}

export function layerById(id: string | null | undefined): LayerDefinition {
  return LAYERS.find((layer) => layer.id === id) ?? LAYERS[0]!;
}

export function layerColor(
  layer: LayerDefinition,
  value: number | null,
  domain: [number, number] = layer.domain,
): string {
  return colorForValue(value, domain, layer.stops);
}

export function layerValue(layer: LayerDefinition, point: AnalysisPoint | null): number | null {
  return point ? layer.valueOf(point) : null;
}

export function formatLayerValue(layer: LayerDefinition, value: number | null): string {
  const formatted = formatNumber(value, layer.digits);
  if (formatted === "—") {
    return formatted;
  }
  return layer.unit ? `${formatted} ${layer.unit}` : formatted;
}

export interface ForecastLayerDefinition {
  id: string;
  label: string;
  shortLabel: string;
  available: false;
}

export const FORECAST_LAYERS: ForecastLayerDefinition[] = [
  { id: "precipitation", label: "降水", shortLabel: "降水", available: false },
  { id: "cloud", label: "云量", shortLabel: "云", available: false },
  { id: "pressure", label: "气压", shortLabel: "气压", available: false },
];

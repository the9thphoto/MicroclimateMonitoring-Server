import type { AnalysisPoint } from "./analysis";
import { colorForValue, formatNumber } from "./colors";

export type LayerId = "temperature" | "humidity" | "thi" | "windSpeed" | "aqi";

export interface LayerCategory {
  min: number;
  max: number;
  label: string;
  color: string;
}

export interface LayerDefinition {
  id: LayerId;
  label: string;
  shortLabel: string;
  unit: string;
  digits: number;
  domain: [number, number];
  stops: string[];
  scale?: "continuous" | "categorical";
  categories?: LayerCategory[];
  adaptiveDomain?: boolean;
  minSpan?: number;
  tickStep?: number;
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
    adaptiveDomain: true,
    minSpan: 4,
    tickStep: 1,
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
    adaptiveDomain: true,
    minSpan: 10,
    tickStep: 5,
    stops: ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"],
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
    scale: "categorical",
    categories: [
      { min: -Infinity, max: 10, label: "寒冷", color: "#313695" },
      { min: 10, max: 17, label: "偏凉", color: "#74add1" },
      { min: 17, max: 24, label: "舒适", color: "#ffffbf" },
      { min: 24, max: 28, label: "偏暖", color: "#fdae61" },
      { min: 28, max: 32, label: "闷热", color: "#f46d43" },
      { min: 32, max: Infinity, label: "酷热", color: "#a50026" },
    ],
    stops: ["#313695", "#74add1", "#ffffbf", "#fdae61", "#f46d43", "#a50026"],
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
    adaptiveDomain: true,
    minSpan: 2,
    tickStep: 1,
    stops: ["#f7fbff", "#deebf7", "#9ecae1", "#4292c6", "#08519c"],
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
    scale: "categorical",
    categories: [
      { min: -Infinity, max: 50, label: "优", color: "#00e400" },
      { min: 50, max: 100, label: "良", color: "#ffff00" },
      { min: 100, max: 150, label: "轻度污染", color: "#ff7e00" },
      { min: 150, max: 200, label: "中度污染", color: "#ff0000" },
      { min: 200, max: 300, label: "重度污染", color: "#8f3f97" },
      { min: 300, max: Infinity, label: "严重污染", color: "#7e0023" },
    ],
    stops: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
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
  if (layer.categories && value !== null && Number.isFinite(value)) {
    const category = layer.categories.find((item) => value >= item.min && value < item.max);
    return category?.color ?? layer.categories[layer.categories.length - 1]?.color ?? "#94a3b8";
  }
  return colorForValue(value, domain, layer.stops);
}

export function layerTicks(layer: LayerDefinition, domain: [number, number]): number[] {
  if (layer.scale === "categorical" || !layer.tickStep) {
    return [domain[0], domain[1]];
  }
  const count = Math.min(6, Math.max(2, Math.round((domain[1] - domain[0]) / layer.tickStep)));
  return Array.from({ length: count + 1 }, (_, index) =>
    Number((domain[0] + ((domain[1] - domain[0]) * index) / count).toFixed(2)),
  );
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

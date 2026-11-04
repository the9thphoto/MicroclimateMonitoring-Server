import type { Measurement } from "@microclimate/api-client";

export type MetricKey =
  | "temperature"
  | "humidity"
  | "dewPoint"
  | "thi"
  | "windSpeed"
  | "co2"
  | "pm25"
  | "pm10"
  | "aqi";

export const METRIC_META: Record<MetricKey, { label: string; unit: string; digits: number }> = {
  temperature: { label: "温度", unit: "°C", digits: 1 },
  humidity: { label: "湿度", unit: "%", digits: 1 },
  dewPoint: { label: "露点", unit: "°C", digits: 1 },
  thi: { label: "温湿指数", unit: "", digits: 1 },
  windSpeed: { label: "风速", unit: "m/s", digits: 1 },
  co2: { label: "CO₂", unit: "ppm", digits: 0 },
  pm25: { label: "PM2.5", unit: "μg/m³", digits: 0 },
  pm10: { label: "PM10", unit: "μg/m³", digits: 0 },
  aqi: { label: "空气质量指数", unit: "", digits: 0 },
};

export interface AnalysisPoint {
  time: number;
  label: string;
  fullLabel: string;
  temperature: number | null;
  humidity: number | null;
  dewPoint: number | null;
  thi: number | null;
  windSpeed: number | null;
  co2: number | null;
  pm25: number | null;
  pm10: number | null;
  aqi: number | null;
}

export interface MetricSummary {
  key: MetricKey;
  label: string;
  unit: string;
  digits: number;
  count: number;
  min: number;
  max: number;
  avg: number;
  first: number;
  last: number;
  change: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteOrNull(value: number | null | undefined): number | null {
  return isFiniteNumber(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Magnus formula, the same approximation used by most weather stations. */
export function dewPoint(temperature: number, humidity: number): number | null {
  if (!isFiniteNumber(temperature) || !isFiniteNumber(humidity)) {
    return null;
  }
  const rh = clamp(humidity, 1, 100);
  const gamma = Math.log(rh / 100) + (17.62 * temperature) / (243.12 + temperature);
  const value = (243.12 * gamma) / (17.62 - gamma);
  return Number.isFinite(value) ? value : null;
}

/** Temperature-humidity index; close to air temperature at moderate humidity. */
export function thi(temperature: number, humidity: number): number | null {
  if (!isFiniteNumber(temperature) || !isFiniteNumber(humidity)) {
    return null;
  }
  return temperature - 0.55 * (1 - clamp(humidity, 0, 100) / 100) * (temperature - 14.5);
}

/** Absolute humidity in g/m³ from temperature and relative humidity. */
export function absoluteHumidity(temperature: number, humidity: number): number | null {
  if (!isFiniteNumber(temperature) || !isFiniteNumber(humidity)) {
    return null;
  }
  const vaporPressure =
    (clamp(humidity, 0, 100) / 100) *
    6.112 *
    Math.exp((17.62 * temperature) / (243.12 + temperature));
  const value = (216.7 * vaporPressure) / (temperature + 273.15);
  return Number.isFinite(value) ? value : null;
}

export type ComfortKey = "cold" | "cool" | "comfortable" | "warm" | "hot" | "sweltering";

export interface Comfort {
  key: ComfortKey;
  label: string;
  advice: string;
}

export function comfortFromThi(value: number | null): Comfort {
  if (value === null) {
    return { key: "comfortable", label: "未知", advice: "暂无足够数据评估体感。" };
  }
  if (value < 10) {
    return { key: "cold", label: "寒冷", advice: "体感寒冷，注意保暖。" };
  }
  if (value < 17) {
    return { key: "cool", label: "偏凉", advice: "体感偏凉，适当添衣。" };
  }
  if (value < 24) {
    return { key: "comfortable", label: "舒适", advice: "温湿适宜，体感舒适。" };
  }
  if (value < 28) {
    return { key: "warm", label: "偏暖", advice: "体感偏暖，注意开窗通风。" };
  }
  if (value < 32) {
    return { key: "hot", label: "闷热", advice: "闷热明显，减少长时间户外活动。" };
  }
  return { key: "sweltering", label: "酷热", advice: "体感酷热，注意防暑补水。" };
}

export const COMFORT_LEGEND: { key: ComfortKey; label: string; color: string }[] = [
  { key: "cold", label: "寒冷", color: "#38bdf8" },
  { key: "cool", label: "偏凉", color: "#22d3ee" },
  { key: "comfortable", label: "舒适", color: "#10b981" },
  { key: "warm", label: "偏暖", color: "#f59e0b" },
  { key: "hot", label: "闷热", color: "#f97316" },
  { key: "sweltering", label: "酷热", color: "#ef4444" },
];

export const COMFORT_COLORS: Record<ComfortKey, string> = Object.fromEntries(
  COMFORT_LEGEND.map((item) => [item.key, item.color]),
) as Record<ComfortKey, string>;

export type Beaufort = { level: number; label: string };

const BEAUFORT_LABELS = [
  "无风",
  "软风",
  "轻风",
  "微风",
  "和风",
  "清劲风",
  "强风",
  "疾风",
  "大风",
  "烈风",
  "狂风",
  "暴风",
  "飓风",
];

const BEAUFORT_LIMITS = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];

export function beaufort(speed: number | null): Beaufort | null {
  if (!isFiniteNumber(speed) || speed < 0) {
    return null;
  }
  let level = 0;
  for (const limit of BEAUFORT_LIMITS) {
    if (speed >= limit) {
      level += 1;
    }
  }
  return { level, label: BEAUFORT_LABELS[level] ?? "未知" };
}

const WIND_DIRECTIONS = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];

export function windDirectionLabel(degrees: number | null): string | null {
  if (!isFiniteNumber(degrees)) {
    return null;
  }
  const normalized = ((degrees % 360) + 360) % 360;
  return WIND_DIRECTIONS[Math.round(normalized / 45) % WIND_DIRECTIONS.length] ?? null;
}

interface Breakpoint {
  low: number;
  high: number;
  indexLow: number;
  indexHigh: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { low: 0, high: 35, indexLow: 0, indexHigh: 50 },
  { low: 35, high: 75, indexLow: 50, indexHigh: 100 },
  { low: 75, high: 115, indexLow: 100, indexHigh: 150 },
  { low: 115, high: 150, indexLow: 150, indexHigh: 200 },
  { low: 150, high: 250, indexLow: 200, indexHigh: 300 },
  { low: 250, high: 350, indexLow: 300, indexHigh: 400 },
  { low: 350, high: 500, indexLow: 400, indexHigh: 500 },
];

const PM10_BREAKPOINTS: Breakpoint[] = [
  { low: 0, high: 50, indexLow: 0, indexHigh: 50 },
  { low: 50, high: 150, indexLow: 50, indexHigh: 100 },
  { low: 150, high: 250, indexLow: 100, indexHigh: 150 },
  { low: 250, high: 350, indexLow: 150, indexHigh: 200 },
  { low: 350, high: 420, indexLow: 200, indexHigh: 300 },
  { low: 420, high: 500, indexLow: 300, indexHigh: 400 },
  { low: 500, high: 600, indexLow: 400, indexHigh: 500 },
];

function individualIndex(value: number, breakpoints: Breakpoint[]): number | null {
  if (!isFiniteNumber(value) || value < 0) {
    return null;
  }
  const clamped = Math.min(value, breakpoints[breakpoints.length - 1]?.high ?? value);
  const interval = breakpoints.find((item) => clamped <= item.high);
  if (!interval) {
    return null;
  }
  const span = interval.high - interval.low;
  if (span <= 0) {
    return interval.indexHigh;
  }
  return Math.round(
    ((interval.indexHigh - interval.indexLow) / span) * (clamped - interval.low) +
      interval.indexLow,
  );
}

/** Reference AQI computed from particulate readings; fine for a dashboard hint. */
export function aqiFromParticulates(pm25: number | null, pm10: number | null): number | null {
  const indexes = [
    individualIndex(pm25 ?? -1, PM25_BREAKPOINTS),
    individualIndex(pm10 ?? -1, PM10_BREAKPOINTS),
  ].filter((value): value is number => value !== null);
  return indexes.length > 0 ? Math.max(...indexes) : null;
}

export type AirTone = "good" | "moderate" | "light" | "heavy" | "severe" | "extreme";

export interface AirQuality {
  aqi: number;
  label: string;
  tone: AirTone;
}

export function airQualityFromAqi(aqi: number): AirQuality {
  if (aqi <= 50) {
    return { aqi, label: "优", tone: "good" };
  }
  if (aqi <= 100) {
    return { aqi, label: "良", tone: "moderate" };
  }
  if (aqi <= 150) {
    return { aqi, label: "轻度污染", tone: "light" };
  }
  if (aqi <= 200) {
    return { aqi, label: "中度污染", tone: "heavy" };
  }
  if (aqi <= 300) {
    return { aqi, label: "重度污染", tone: "severe" };
  }
  return { aqi, label: "严重污染", tone: "extreme" };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function pointLabel(date: Date, spanMs: number): string {
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (spanMs > 24 * 60 * 60 * 1000) {
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${clock}`;
  }
  return clock;
}

/** Convert API rows (newest first) into oldest-first analysis points. */
export function toAnalysisPoints(
  rows: Measurement[],
  spanMs = 0,
  maxPoints = 360,
): AnalysisPoint[] {
  const ordered = [...rows].sort(
    (left, right) => Date.parse(left.observed_at) - Date.parse(right.observed_at),
  );
  if (ordered.length === 0) {
    return [];
  }

  const step = Math.max(1, Math.ceil(ordered.length / maxPoints));
  const sampled = ordered.filter((_, index) => index % step === 0);
  const last = ordered[ordered.length - 1];
  if (last && sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled.map((row) => {
    const date = new Date(row.observed_at);
    const temperature = Number.isFinite(row.temperature) ? row.temperature : null;
    const humidity = Number.isFinite(row.humidity) ? row.humidity : null;
    return {
      time: date.getTime(),
      label: pointLabel(date, spanMs),
      fullLabel: Number.isNaN(date.getTime())
        ? row.observed_at
        : date.toLocaleString("zh-CN", { hour12: false }),
      temperature,
      humidity,
      dewPoint: temperature !== null && humidity !== null ? dewPoint(temperature, humidity) : null,
      thi: temperature !== null && humidity !== null ? thi(temperature, humidity) : null,
      windSpeed: finiteOrNull(row.wind_speed),
      co2: finiteOrNull(row.co2),
      pm25: finiteOrNull(row.pm25),
      pm10: finiteOrNull(row.pm10),
      aqi: aqiFromParticulates(row.pm25, row.pm10),
    };
  });
}

export function summarizeMetric(points: AnalysisPoint[], key: MetricKey): MetricSummary | null {
  const values = points.map((point) => point[key]).filter(isFiniteNumber);
  if (values.length === 0) {
    return null;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((total, value) => total + value, 0) / values.length;
  const first = values[0] ?? avg;
  const last = values[values.length - 1] ?? avg;
  return {
    key,
    ...METRIC_META[key],
    count: values.length,
    min,
    max,
    avg,
    first,
    last,
    change: last - first,
  };
}

export interface HourlyPoint {
  hour: number;
  label: string;
  temperature: number;
  humidity: number;
  count: number;
}

export function hourlyProfile(points: AnalysisPoint[]): HourlyPoint[] {
  const buckets = new Map<number, { temperature: number; humidity: number; count: number }>();
  for (const point of points) {
    if (point.temperature === null || point.humidity === null) {
      continue;
    }
    const hour = new Date(point.time).getHours();
    const bucket = buckets.get(hour) ?? { temperature: 0, humidity: 0, count: 0 };
    bucket.temperature += point.temperature;
    bucket.humidity += point.humidity;
    bucket.count += 1;
    buckets.set(hour, bucket);
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([hour, bucket]) => ({
      hour,
      label: `${pad(hour)}:00`,
      temperature: bucket.temperature / bucket.count,
      humidity: bucket.humidity / bucket.count,
      count: bucket.count,
    }));
}

export interface DiurnalInsight {
  warmest: HourlyPoint;
  coolest: HourlyPoint;
  mostHumid: HourlyPoint;
}

export function diurnalInsight(profile: HourlyPoint[]): DiurnalInsight | null {
  if (profile.length === 0) {
    return null;
  }
  return {
    warmest: profile.reduce((best, item) => (item.temperature > best.temperature ? item : best)),
    coolest: profile.reduce((best, item) => (item.temperature < best.temperature ? item : best)),
    mostHumid: profile.reduce((best, item) => (item.humidity > best.humidity ? item : best)),
  };
}

export interface DataQuality {
  count: number;
  expected: number;
  coverage: number;
  maxGapMinutes: number;
  gaps: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
}

export function dataQuality(
  rows: Measurement[],
  rangeMs: number,
  intervalMs = 60_000,
): DataQuality {
  const times = rows
    .map((row) => Date.parse(row.observed_at))
    .filter((time) => Number.isFinite(time))
    .sort((left, right) => left - right);
  const expected = Math.max(1, Math.round(rangeMs / intervalMs));
  let maxGap = 0;
  let gaps = 0;
  for (let index = 1; index < times.length; index += 1) {
    const diff = (times[index] ?? 0) - (times[index - 1] ?? 0);
    if (diff > intervalMs * 2) {
      gaps += 1;
      maxGap = Math.max(maxGap, diff);
    }
  }
  return {
    count: rows.length,
    expected,
    coverage: Math.min(1, times.length / expected),
    maxGapMinutes: Math.round(maxGap / 60_000),
    gaps,
    firstObservedAt: times.length > 0 ? new Date(times[0] ?? 0).toISOString() : null,
    lastObservedAt: times.length > 0 ? new Date(times[times.length - 1] ?? 0).toISOString() : null,
  };
}

export interface WindSnapshot {
  averageSpeed: number;
  maxSpeed: number;
  direction: number | null;
  directionLabel: string | null;
  beaufort: Beaufort | null;
  samples: number;
}

export interface AirSnapshot {
  aqi: number;
  quality: AirQuality;
  pm25: number | null;
  pm10: number | null;
  samples: number;
}

export interface Co2Snapshot {
  average: number;
  max: number;
  level: string;
  samples: number;
}

export interface EnvironmentSnapshot {
  wind: WindSnapshot | null;
  air: AirSnapshot | null;
  co2: Co2Snapshot | null;
  sensors: {
    wind: boolean;
    co2: boolean;
    particulates: boolean;
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function co2Level(value: number): string {
  if (value < 800) {
    return "清新";
  }
  if (value < 1000) {
    return "正常";
  }
  if (value < 1500) {
    return "偏高";
  }
  return "过高";
}

export function environmentSnapshot(rows: Measurement[]): EnvironmentSnapshot {
  const ordered = [...rows].sort(
    (left, right) => Date.parse(left.observed_at) - Date.parse(right.observed_at),
  );
  const windSpeeds = ordered
    .map((row) => row.wind_speed)
    .filter((value): value is number => isFiniteNumber(value));
  const windDirections = ordered
    .map((row) => row.wind_direction)
    .filter((value): value is number => isFiniteNumber(value));
  const co2Values = ordered
    .map((row) => row.co2)
    .filter((value): value is number => isFiniteNumber(value));
  const pm25Values = ordered
    .map((row) => row.pm25)
    .filter((value): value is number => isFiniteNumber(value));
  const pm10Values = ordered
    .map((row) => row.pm10)
    .filter((value): value is number => isFiniteNumber(value));

  const windAverage = average(windSpeeds);
  const direction =
    windDirections.length > 0 ? (windDirections[windDirections.length - 1] ?? null) : null;
  const co2Average = average(co2Values);
  const pm25Average = average(pm25Values);
  const pm10Average = average(pm10Values);
  const aqi =
    pm25Average !== null || pm10Average !== null
      ? aqiFromParticulates(pm25Average, pm10Average)
      : null;

  return {
    wind:
      windAverage !== null
        ? {
            averageSpeed: windAverage,
            maxSpeed: Math.max(...windSpeeds),
            direction,
            directionLabel: windDirectionLabel(direction),
            beaufort: beaufort(windAverage),
            samples: windSpeeds.length,
          }
        : null,
    air:
      aqi !== null
        ? {
            aqi,
            quality: airQualityFromAqi(aqi),
            pm25: pm25Average,
            pm10: pm10Average,
            samples: Math.max(pm25Values.length, pm10Values.length),
          }
        : null,
    co2:
      co2Average !== null
        ? {
            average: co2Average,
            max: Math.max(...co2Values),
            level: co2Level(co2Average),
            samples: co2Values.length,
          }
        : null,
    sensors: {
      wind: windSpeeds.length > 0,
      co2: co2Values.length > 0,
      particulates: pm25Values.length > 0 || pm10Values.length > 0,
    },
  };
}

export type HeatmapMetric = "temperature" | "humidity";

export interface HeatmapDay {
  date: string;
  label: string;
}

export interface HeatmapCell {
  date: string;
  hour: number;
  value: number | null;
  count: number;
}

export interface HeatmapData {
  days: HeatmapDay[];
  cells: HeatmapCell[];
  min: number | null;
  max: number | null;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDateLabel(date: Date): string {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

/** Aggregate points into a local day × hour matrix; missing buckets stay null. */
export function buildHeatmap(points: AnalysisPoint[], metric: HeatmapMetric): HeatmapData {
  const dayMap = new Map<
    string,
    { date: string; label: string; hours: Map<number, { sum: number; count: number }> }
  >();

  for (const point of points) {
    const value = point[metric];
    if (!isFiniteNumber(value)) {
      continue;
    }
    const date = new Date(point.time);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const key = localDateKey(date);
    const day = dayMap.get(key) ?? {
      date: key,
      label: localDateLabel(date),
      hours: new Map<number, { sum: number; count: number }>(),
    };
    const hour = date.getHours();
    const bucket = day.hours.get(hour) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    day.hours.set(hour, bucket);
    dayMap.set(key, day);
  }

  const days = [...dayMap.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(({ date, label }) => ({ date, label }));
  const cells: HeatmapCell[] = [];
  let min: number | null = null;
  let max: number | null = null;

  for (const day of dayMap.values()) {
    for (let hour = 0; hour < 24; hour += 1) {
      const bucket = day.hours.get(hour);
      const value = bucket && bucket.count > 0 ? bucket.sum / bucket.count : null;
      if (value !== null) {
        min = min === null ? value : Math.min(min, value);
        max = max === null ? value : Math.max(max, value);
      }
      cells.push({
        date: day.date,
        hour,
        value,
        count: bucket?.count ?? 0,
      });
    }
  }

  return { days, cells, min, max };
}

export interface WindRoseBin {
  direction: number;
  label: string;
  count: number;
  averageSpeed: number;
  maxSpeed: number;
}

const WIND_ROSE_LABELS = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];

/** Eight-sector wind rose; requires both wind speed and direction. */
export function windRose(rows: Measurement[]): WindRoseBin[] | null {
  const buckets = WIND_ROSE_LABELS.map((label, index) => ({
    direction: index * 45,
    label,
    count: 0,
    total: 0,
    maxSpeed: 0,
  }));
  let samples = 0;

  for (const row of rows) {
    if (!isFiniteNumber(row.wind_speed) || !isFiniteNumber(row.wind_direction)) {
      continue;
    }
    const index = Math.round((((row.wind_direction % 360) + 360) % 360) / 45) % 8;
    const bucket = buckets[index];
    if (!bucket) {
      continue;
    }
    bucket.count += 1;
    bucket.total += row.wind_speed;
    bucket.maxSpeed = Math.max(bucket.maxSpeed, row.wind_speed);
    samples += 1;
  }

  if (samples === 0) {
    return null;
  }
  return buckets.map((bucket) => ({
    direction: bucket.direction,
    label: bucket.label,
    count: bucket.count,
    averageSpeed: bucket.count > 0 ? bucket.total / bucket.count : 0,
    maxSpeed: bucket.maxSpeed,
  }));
}

export type BoxMetric = "temperature" | "humidity";

export interface BoxPlotHour {
  hour: number;
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
}

function quantile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  if (sorted.length === 1) {
    return sorted[0] ?? 0;
  }
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}

/** Hour-of-day box-plot statistics for distribution analysis. */
export function hourlyBoxPlot(points: AnalysisPoint[], metric: BoxMetric): BoxPlotHour[] {
  const buckets = new Map<number, number[]>();
  for (const point of points) {
    const value = point[metric];
    if (!isFiniteNumber(value)) {
      continue;
    }
    const hour = new Date(point.time).getHours();
    const values = buckets.get(hour) ?? [];
    values.push(value);
    buckets.set(hour, values);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([hour, values]) => {
      const sorted = [...values].sort((left, right) => left - right);
      return {
        hour,
        label: `${pad(hour)}:00`,
        min: sorted[0] ?? 0,
        q1: quantile(sorted, 0.25),
        median: quantile(sorted, 0.5),
        q3: quantile(sorted, 0.75),
        max: sorted[sorted.length - 1] ?? 0,
        count: sorted.length,
      };
    });
}

export interface CorrelationMetric {
  key: MetricKey;
  label: string;
}

export interface CorrelationResult {
  metrics: CorrelationMetric[];
  values: (number | null)[][];
}

const CORRELATION_KEYS: MetricKey[] = [
  "temperature",
  "humidity",
  "dewPoint",
  "thi",
  "windSpeed",
  "co2",
  "pm25",
  "pm10",
];

function pearson(pairs: [number, number][]): number | null {
  if (pairs.length < 3) {
    return null;
  }
  const count = pairs.length;
  const meanLeft = pairs.reduce((total, [left]) => total + left, 0) / count;
  const meanRight = pairs.reduce((total, [, right]) => total + right, 0) / count;
  let covariance = 0;
  let varianceLeft = 0;
  let varianceRight = 0;
  for (const [left, right] of pairs) {
    const deltaLeft = left - meanLeft;
    const deltaRight = right - meanRight;
    covariance += deltaLeft * deltaRight;
    varianceLeft += deltaLeft * deltaLeft;
    varianceRight += deltaRight * deltaRight;
  }
  const denominator = Math.sqrt(varianceLeft * varianceRight);
  if (denominator === 0) {
    return null;
  }
  return Math.max(-1, Math.min(1, covariance / denominator));
}

/** Pearson correlation matrix over metrics with at least three samples. */
export function correlationMatrix(points: AnalysisPoint[]): CorrelationResult {
  const metrics = CORRELATION_KEYS.filter(
    (key) => points.filter((point) => isFiniteNumber(point[key])).length >= 3,
  ).map((key) => ({ key, label: METRIC_META[key].label }));

  const values = metrics.map((rowMetric) =>
    metrics.map((columnMetric) => {
      if (rowMetric.key === columnMetric.key) {
        return 1;
      }
      const pairs: [number, number][] = [];
      for (const point of points) {
        const left = point[rowMetric.key];
        const right = point[columnMetric.key];
        if (isFiniteNumber(left) && isFiniteNumber(right)) {
          pairs.push([left, right]);
        }
      }
      return pearson(pairs);
    }),
  );

  return { metrics, values };
}

export function comfortZoneShare(points: AnalysisPoint[]): number | null {
  const usable = points.filter((point) => point.temperature !== null && point.humidity !== null);
  if (usable.length === 0) {
    return null;
  }
  const comfortable = usable.filter(
    (point) =>
      (point.temperature ?? 0) >= 18 &&
      (point.temperature ?? 0) <= 26 &&
      (point.humidity ?? 0) >= 40 &&
      (point.humidity ?? 0) <= 65,
  );
  return comfortable.length / usable.length;
}

export function ageLabel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) {
    return "—";
  }
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) {
    return "—";
  }
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) {
    return "刚刚";
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} 分钟前`;
  }
  if (seconds < 86_400) {
    return `${Math.floor(seconds / 3600)} 小时前`;
  }
  return `${Math.floor(seconds / 86_400)} 天前`;
}

import type { Measurement } from "@microclimate/api-client";
import type { ChartPoint } from "@microclimate/ui";
import { formatClock } from "@microclimate/ui";

export type RangeKey = "1h" | "6h" | "24h" | "7d";

export interface RangeOptionDefinition {
  key: RangeKey;
  label: string;
  milliseconds: number;
}

export const RANGE_OPTIONS: RangeOptionDefinition[] = [
  { key: "1h", label: "1 小时", milliseconds: 60 * 60 * 1000 },
  { key: "6h", label: "6 小时", milliseconds: 6 * 60 * 60 * 1000 },
  { key: "24h", label: "24 小时", milliseconds: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 天", milliseconds: 7 * 24 * 60 * 60 * 1000 },
];

export function isRangeKey(value: string): value is RangeKey {
  return RANGE_OPTIONS.some((option) => option.key === value);
}

export function rangeWindow(key: RangeKey, now = new Date()): { start: Date; end: Date } {
  const option = RANGE_OPTIONS.find((item) => item.key === key) ?? RANGE_OPTIONS[2];
  if (!option) {
    throw new Error("no range options configured");
  }
  return {
    start: new Date(now.getTime() - option.milliseconds),
    end: now,
  };
}

/**
 * Convert newest-first measurements into oldest-first chart points and keep
 * the payload small enough for Recharts even on a seven-day range.
 */
export function toChartPoints(rows: Measurement[], maxPoints = 360): ChartPoint[] {
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

  return sampled.map((item) => ({
    label: formatClock(item.observed_at),
    temperature: item.temperature,
    humidity: item.humidity,
  }));
}

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

export function isRangeKey(value: string | null | undefined): value is RangeKey {
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

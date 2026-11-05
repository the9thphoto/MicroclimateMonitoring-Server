const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

const COMPASS_ZH = [
  "北",
  "北东北",
  "东北",
  "东东北",
  "东",
  "东东南",
  "东南",
  "南东南",
  "南",
  "南西南",
  "西南",
  "西西南",
  "西",
  "西西北",
  "西北",
  "北西北",
] as const;

export function normalizeDirection(degrees: number | null): number | null {
  if (degrees === null || !Number.isFinite(degrees)) {
    return null;
  }
  return ((degrees % 360) + 360) % 360;
}

export function compassIndex(degrees: number | null): number | null {
  const normalized = normalizeDirection(degrees);
  if (normalized === null) {
    return null;
  }
  return Math.round(normalized / 22.5) % 16;
}

export function formatWindDirection(degrees: number | null): string | null {
  const normalized = normalizeDirection(degrees);
  const index = compassIndex(degrees);
  if (normalized === null || index === null) {
    return null;
  }
  return `${COMPASS[index]}（${COMPASS_ZH[index]}）${normalized.toFixed(0)}° 来向`;
}

export function mpsToKnots(mps: number): number {
  return mps * 1.94384;
}

export function formatWindSpeed(mps: number | null): string | null {
  if (mps === null || !Number.isFinite(mps)) {
    return null;
  }
  return `${mps.toFixed(1)} m/s（${mpsToKnots(mps).toFixed(1)} kt）`;
}

export interface WindBarbParts {
  calm: boolean;
  pennants: number;
  fullBarbs: number;
  halfBarbs: number;
  knots: number;
}

export function windBarbParts(mps: number | null): WindBarbParts | null {
  if (mps === null || !Number.isFinite(mps) || mps < 0) {
    return null;
  }
  const knots = mpsToKnots(mps);
  if (knots < 2.5) {
    return { calm: true, pennants: 0, fullBarbs: 0, halfBarbs: 0, knots };
  }
  const rounded = Math.round(knots / 5) * 5;
  const pennants = Math.floor(rounded / 50);
  let rest = rounded % 50;
  const fullBarbs = Math.floor(rest / 10);
  rest %= 10;
  const halfBarbs = rest >= 5 ? 1 : 0;
  return { calm: false, pennants, fullBarbs, halfBarbs, knots };
}

function barbPoints(kind: "full" | "half" | "pennant", index: number): string {
  const y = 34 - index * 5;
  if (kind === "pennant") {
    return `M 30 ${y} L 18 ${y - 4} L 30 ${y - 8} Z`;
  }
  const length = kind === "half" ? 6 : 12;
  return `M 30 ${y} L ${30 - length} ${y - 4}`;
}

export function windBarbSvg(direction: number, speedMps: number, size = 38): string {
  const parts = windBarbParts(speedMps);
  if (!parts) {
    return "";
  }
  const normalized = normalizeDirection(direction) ?? 0;
  if (parts.calm) {
    return `<svg class="wind-barb-svg" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="4" fill="none" stroke="#c7e4ea" stroke-width="1.6"/></svg>`;
  }
  let feathers = "";
  let index = 0;
  for (let i = 0; i < parts.pennants; i += 1) {
    feathers += barbPoints("pennant", index);
    index += 2;
  }
  for (let i = 0; i < parts.fullBarbs; i += 1) {
    feathers += barbPoints("full", index);
    index += 1;
  }
  if (parts.halfBarbs > 0) {
    feathers += barbPoints("half", index);
  }
  return `<svg class="wind-barb-svg" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><g transform="rotate(${normalized} 20 20)"><line x1="20" y1="34" x2="20" y2="8" stroke="#c7e4ea" stroke-width="1.6"/><path d="${feathers}" fill="#c7e4ea" stroke="#c7e4ea" stroke-width="1.2"/></g></svg>`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : value;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

export function mixHex(from: string, to: string, ratio: number): string {
  const [fromR, fromG, fromB] = hexToRgb(from);
  const [toR, toG, toB] = hexToRgb(to);
  const clamped = clamp(ratio, 0, 1);
  const channel = (left: number, right: number) =>
    Math.round(left + (right - left) * clamped)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(fromR, toR)}${channel(fromG, toG)}${channel(fromB, toB)}`;
}

/** Sample a multi-stop gradient. Stops are evenly spaced. */
export function sampleGradient(stops: string[], ratio: number): string {
  if (stops.length === 0) {
    return "#64748b";
  }
  if (stops.length === 1) {
    return stops[0] ?? "#64748b";
  }
  const clamped = clamp(ratio, 0, 1);
  const position = clamped * (stops.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(stops.length - 1, lower + 1);
  const weight = position - lower;
  return mixHex(
    stops[lower] ?? stops[0] ?? "#64748b",
    stops[upper] ?? stops[stops.length - 1] ?? "#64748b",
    weight,
  );
}

export function colorForValue(
  value: number | null,
  domain: [number, number],
  stops: string[],
): string {
  if (value === null || !Number.isFinite(value)) {
    return "#94a3b8";
  }
  const span = domain[1] - domain[0] || 1;
  return sampleGradient(stops, (value - domain[0]) / span);
}

export function formatNumber(value: number | null, digits: number): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

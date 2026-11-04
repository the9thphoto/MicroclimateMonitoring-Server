interface SparklineProps {
  values: (number | null)[];
  color: string;
  height?: number;
}

/** Small decorative trend line; the surrounding card carries the text values. */
export function Sparkline({ values, color, height = 34 }: SparklineProps) {
  const finite = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (finite.length < 2) {
    return <span className="sparkline sparkline--empty" aria-hidden="true" />;
  }

  const step = Math.max(1, Math.ceil(finite.length / 36));
  const sampled = finite.filter((_, index) => index % step === 0);
  const last = finite[finite.length - 1];
  if (last !== undefined && sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const span = max - min || 1;
  const width = 120;
  const padding = 2;
  const usableHeight = height - padding * 2;

  const points = sampled.map((value, index) => {
    const x = sampled.length === 1 ? width : (index / (sampled.length - 1)) * width;
    const y = padding + (1 - (value - min) / span) * usableHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const area = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={area} fill={color} opacity={0.1} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

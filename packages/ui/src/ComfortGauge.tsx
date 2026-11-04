const CX = 130;
const CY = 116;
const RADIUS = 92;

export interface GaugeSegment {
  from: number;
  to: number;
  color: string;
  label: string;
}

interface ComfortGaugeProps {
  value: number | null;
  segments: GaugeSegment[];
  min?: number;
  max?: number;
  label?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function point(angle: number, radius: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(radians),
    y: CY - radius * Math.sin(radians),
  };
}

function arc(startAngle: number, endAngle: number, radius: number): string {
  const start = point(startAngle, radius);
  const end = point(endAngle, radius);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function ComfortGauge({
  value,
  segments,
  min = 0,
  max = 40,
  label = "温湿指数",
}: ComfortGaugeProps) {
  const span = max - min || 1;
  const clamped = value === null ? null : clamp(value, min, max);
  const ratio = clamped === null ? 0 : (clamped - min) / span;
  const needleAngle = 180 - ratio * 180;
  const markerOuter = point(needleAngle, RADIUS);
  const markerInner = point(needleAngle, RADIUS - 18);

  return (
    <div className="comfort-gauge">
      <svg
        viewBox="0 0 260 140"
        role="img"
        aria-label={clamped === null ? `${label}暂无数据` : `${label} ${clamped.toFixed(1)}`}
      >
        {segments.map((segment) => {
          const start = 180 - ((clamp(segment.from, min, max) - min) / span) * 180;
          const end = 180 - ((clamp(segment.to, min, max) - min) / span) * 180;
          return (
            <path
              key={`${segment.from}-${segment.to}`}
              d={arc(start, end, RADIUS)}
              fill="none"
              stroke={segment.color}
              strokeWidth={13}
              strokeLinecap="butt"
              opacity={0.9}
            />
          );
        })}
        <path
          d={arc(180, 0, RADIUS - 24)}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={1}
        />
        {clamped === null ? null : (
          <>
            <line
              x1={markerInner.x}
              y1={markerInner.y}
              x2={markerOuter.x}
              y2={markerOuter.y}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={markerOuter.x} cy={markerOuter.y} r={4.5} fill="#ffffff" />
            <circle cx={CX} cy={CY} r={4} fill="#ffffff" opacity={0.9} />
          </>
        )}
        <text x={CX} y={80} textAnchor="middle" className="comfort-gauge__value">
          {clamped === null ? "—" : clamped.toFixed(1)}
        </text>
        <text x={CX} y={98} textAnchor="middle" className="comfort-gauge__label">
          {label}
        </text>
        <text x={CX - RADIUS} y={CY + 16} textAnchor="middle" className="comfort-gauge__tick">
          {min}
        </text>
        <text x={CX + RADIUS} y={CY + 16} textAnchor="middle" className="comfort-gauge__tick">
          {max}
        </text>
      </svg>
      <ul className="comfort-gauge__legend" aria-hidden="true">
        {segments.map((segment) => (
          <li key={`${segment.from}-${segment.to}`}>
            <i style={{ background: segment.color }} />
            {segment.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

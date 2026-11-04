export interface WindRoseBin {
  direction: number;
  label: string;
  count: number;
  averageSpeed: number;
  maxSpeed: number;
}

interface WindRoseProps {
  bins: WindRoseBin[];
  size?: number;
}

function polar(angleDegrees: number, radius: number, center: number): { x: number; y: number } {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}

function wedge(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  center: number,
): string {
  const startOuter = polar(startAngle, outerRadius, center);
  const endOuter = polar(endAngle, outerRadius, center);
  const endInner = polar(endAngle, innerRadius, center);
  const startInner = polar(startAngle, innerRadius, center);
  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function speedColor(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  const from = [186, 230, 253];
  const to = [14, 116, 144];
  const channel = (index: number) =>
    Math.round((from[index] ?? 0) + ((to[index] ?? 0) - (from[index] ?? 0)) * clamped)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

export function WindRose({ bins, size = 240 }: WindRoseProps) {
  const center = size / 2;
  const radius = center - 28;
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  const maxCount = Math.max(1, ...bins.map((bin) => bin.count));
  const maxSpeed = Math.max(1, ...bins.map((bin) => bin.averageSpeed));
  const dominant = bins.reduce<WindRoseBin | null>(
    (best, bin) => (best === null || bin.count > best.count ? bin : best),
    null,
  );
  const label = dominant
    ? `风玫瑰图，主导风向 ${dominant.label}，共 ${total} 个有效风速样本`
    : "风玫瑰图，暂无有效风速数据";

  return (
    <div className="wind-rose">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <circle
            key={fraction}
            cx={center}
            cy={center}
            r={radius * fraction}
            fill="none"
            stroke="#e2e8f0"
            strokeDasharray={fraction === 1 ? undefined : "3 4"}
          />
        ))}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const end = polar(angle, radius, center);
          return (
            <line
              key={angle}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="#e2e8f0"
              strokeDasharray="2 4"
            />
          );
        })}
        {bins.map((bin) => {
          if (bin.count === 0) {
            return null;
          }
          const outer = 10 + (bin.count / maxCount) * (radius - 10);
          const color = speedColor(bin.averageSpeed / maxSpeed);
          return (
            <path
              key={bin.direction}
              d={wedge(bin.direction - 20, bin.direction + 20, 10, outer, center)}
              fill={color}
              fillOpacity={0.78}
              stroke="#ffffff"
              strokeWidth={1}
            >
              <title>
                {`${bin.label}：${bin.count} 次，平均 ${bin.averageSpeed.toFixed(1)} m/s，最大 ${bin.maxSpeed.toFixed(1)} m/s`}
              </title>
            </path>
          );
        })}
        {bins.map((bin) => {
          const pos = polar(bin.direction, radius + 14, center);
          return (
            <text
              key={`label-${bin.direction}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="wind-rose__direction"
            >
              {bin.label}
            </text>
          );
        })}
        <circle cx={center} cy={center} r={26} fill="#ffffff" stroke="#e2e8f0" />
        <text x={center} y={center - 4} textAnchor="middle" className="wind-rose__total">
          {total}
        </text>
        <text x={center} y={center + 10} textAnchor="middle" className="wind-rose__unit">
          次
        </text>
      </svg>
      <div className="wind-rose__meta">
        <span>花瓣长度 = 出现次数</span>
        <span>
          <i style={{ background: `linear-gradient(90deg, #bae6fd, #0e7490)` }} />
          颜色 = 平均风速
        </span>
      </div>
    </div>
  );
}

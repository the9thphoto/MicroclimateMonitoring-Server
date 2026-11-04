interface AqiScaleProps {
  value: number;
  label: string;
  tone: string;
}

const SEGMENTS = [
  { to: 50, label: "优", tone: "good" },
  { to: 100, label: "良", tone: "moderate" },
  { to: 150, label: "轻度", tone: "light" },
  { to: 200, label: "中度", tone: "heavy" },
  { to: 300, label: "重度", tone: "severe" },
  { to: 500, label: "严重", tone: "extreme" },
];

export function AqiScale({ value, label, tone }: AqiScaleProps) {
  const percent = Math.min(100, Math.max(0, (value / 300) * 100));

  return (
    <div
      className={`aqi-scale aqi-scale--${tone}`}
      role="img"
      aria-label={`空气质量指数 ${value}，${label}`}
    >
      <div className="aqi-scale__bar" aria-hidden="true">
        {SEGMENTS.map((segment) => (
          <span
            key={segment.tone}
            className={`aqi-scale__segment aqi-scale__segment--${segment.tone}`}
          />
        ))}
        <i className="aqi-scale__marker" style={{ left: `${percent}%` }} />
      </div>
      <div className="aqi-scale__labels" aria-hidden="true">
        {SEGMENTS.map((segment) => (
          <span key={segment.tone}>{segment.label}</span>
        ))}
      </div>
    </div>
  );
}

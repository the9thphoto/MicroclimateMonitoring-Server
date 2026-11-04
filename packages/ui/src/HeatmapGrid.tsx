export interface HeatmapGridDay {
  date: string;
  label: string;
}

export interface HeatmapGridCell {
  date: string;
  hour: number;
  value: number | null;
  count: number;
}

interface HeatmapGridProps {
  days: HeatmapGridDay[];
  cells: HeatmapGridCell[];
  min: number | null;
  max: number | null;
  colors: [string, string];
  unit: string;
  ariaLabel: string;
  digits?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function mixColor(from: string, to: string, ratio: number): string {
  const [leftR, leftG, leftB] = hexToRgb(from);
  const [rightR, rightG, rightB] = hexToRgb(to);
  const clamped = Math.min(1, Math.max(0, ratio));
  const channel = (left: number, right: number) =>
    Math.round(left + (right - left) * clamped)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(leftR, rightR)}${channel(leftG, rightG)}${channel(leftB, rightB)}`;
}

export function HeatmapGrid({
  days,
  cells,
  min,
  max,
  colors,
  unit,
  ariaLabel,
  digits = 1,
}: HeatmapGridProps) {
  const cellMap = new Map(cells.map((cell) => [`${cell.date}-${cell.hour}`, cell]));
  const span = min !== null && max !== null ? max - min : 0;
  const columns = `68px repeat(24, minmax(16px, 1fr))`;
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return (
    <div className="heatmap">
      <div className="heatmap__scroll">
        <div
          className="heatmap__grid"
          role="img"
          aria-label={ariaLabel}
          style={{ gridTemplateColumns: columns }}
        >
          <span className="heatmap__corner" aria-hidden="true" />
          {hours.map((hour) => (
            <span key={`head-${hour}`} className="heatmap__hour" aria-hidden="true">
              {hour % 3 === 0 ? `${hour}` : ""}
            </span>
          ))}
          {days.map((day) => (
            <div className="heatmap__row" key={day.date} style={{ display: "contents" }}>
              <span className="heatmap__day">{day.label}</span>
              {hours.map((hour) => {
                const cell = cellMap.get(`${day.date}-${hour}`);
                const value = cell?.value ?? null;
                const ratio = value === null ? 0 : span === 0 ? 0.5 : (value - (min ?? 0)) / span;
                const title =
                  value === null
                    ? `${day.label} ${hour}:00 无采样`
                    : `${day.label} ${hour}:00 ${value.toFixed(digits)} ${unit}（${cell?.count ?? 0} 个采样）`;
                return (
                  <span
                    key={`${day.date}-${hour}`}
                    className={value === null ? "heatmap__cell is-empty" : "heatmap__cell"}
                    style={
                      value === null
                        ? undefined
                        : { background: mixColor(colors[0], colors[1], ratio) }
                    }
                    title={title}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap__legend" aria-hidden="true">
        <span>{min === null ? "—" : min.toFixed(digits)}</span>
        <i style={{ background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})` }} />
        <span>{max === null ? "—" : max.toFixed(digits)}</span>
        <span className="heatmap__legend-unit">{unit}</span>
      </div>
    </div>
  );
}

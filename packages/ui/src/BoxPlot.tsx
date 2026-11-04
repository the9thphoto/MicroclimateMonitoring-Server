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

interface BoxPlotProps {
  hours: BoxPlotHour[];
  unit: string;
  label: string;
  color: string;
  digits?: number;
}

const WIDTH = 720;
const HEIGHT = 230;
const MARGIN = { top: 16, right: 16, bottom: 30, left: 46 };

function format(value: number, digits: number): string {
  return value.toFixed(digits);
}

export function BoxPlot({ hours, unit, label, color, digits = 1 }: BoxPlotProps) {
  if (hours.length === 0) {
    return null;
  }
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const values = hours.flatMap((hour) => [hour.min, hour.max]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = (rawMax - rawMin || 1) * 0.12;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const span = max - min || 1;

  const x = (hour: number) => MARGIN.left + (hour / 23) * plotWidth;
  const y = (value: number) => MARGIN.top + (1 - (value - min) / span) * plotHeight;
  const boxWidth = 15;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => min + fraction * span);

  return (
    <div className="box-plot">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${label}按小时分布箱线图`}
      >
        <title>{`${label}按小时分布箱线图`}</title>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e2e8f0"
              strokeDasharray="3 4"
            />
            <text
              x={MARGIN.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="box-plot__tick"
            >
              {format(tick, digits)}
            </text>
          </g>
        ))}
        {hours.map((hour) => {
          const center = x(hour.hour);
          return (
            <g key={hour.hour}>
              <line
                x1={center}
                x2={center}
                y1={y(hour.min)}
                y2={y(hour.max)}
                stroke={color}
                strokeWidth={1.2}
              />
              <line
                x1={center - 5}
                x2={center + 5}
                y1={y(hour.min)}
                y2={y(hour.min)}
                stroke={color}
                strokeWidth={1.2}
              />
              <line
                x1={center - 5}
                x2={center + 5}
                y1={y(hour.max)}
                y2={y(hour.max)}
                stroke={color}
                strokeWidth={1.2}
              />
              <rect
                x={center - boxWidth / 2}
                y={y(hour.q3)}
                width={boxWidth}
                height={Math.max(1, y(hour.q1) - y(hour.q3))}
                fill={color}
                fillOpacity={0.18}
                stroke={color}
                rx={3}
              >
                <title>
                  {`${hour.label}：中位 ${format(hour.median, digits)} ${unit}，范围 ${format(hour.min, digits)}–${format(hour.max, digits)} ${unit}，${hour.count} 个采样`}
                </title>
              </rect>
              <line
                x1={center - boxWidth / 2}
                x2={center + boxWidth / 2}
                y1={y(hour.median)}
                y2={y(hour.median)}
                stroke={color}
                strokeWidth={2}
              />
            </g>
          );
        })}
        {hours.map((hour) =>
          hour.hour % 3 === 0 ? (
            <text
              key={`x-${hour.hour}`}
              x={x(hour.hour)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="box-plot__tick"
            >
              {hour.label}
            </text>
          ) : null,
        )}
        <text x={WIDTH - MARGIN.right} y={11} textAnchor="end" className="box-plot__unit">
          {unit}
        </text>
      </svg>
    </div>
  );
}

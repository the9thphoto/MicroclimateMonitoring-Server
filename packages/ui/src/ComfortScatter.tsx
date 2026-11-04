import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

export interface ComfortScatterPoint {
  label: string;
  temperature: number;
  humidity: number;
  comfort: string;
  color: string;
}

interface ComfortScatterProps {
  points: ComfortScatterPoint[];
  ariaLabel?: string;
}

export function ComfortScatter({ points, ariaLabel = "温湿度舒适度分布图" }: ComfortScatterProps) {
  const temperatures = points.map((point) => point.temperature);
  const minTemperature = Math.min(...temperatures, 18);
  const maxTemperature = Math.max(...temperatures, 26);

  return (
    <div className="comfort-scatter" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            type="number"
            dataKey="temperature"
            name="温度"
            unit="°C"
            domain={[Math.floor(minTemperature - 1), Math.ceil(maxTemperature + 1)]}
            tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="number"
            dataKey="humidity"
            name="湿度"
            unit="%"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <ZAxis range={[34, 34]} />
          <ReferenceArea
            x1={18}
            x2={26}
            y1={40}
            y2={65}
            fill="#10b981"
            fillOpacity={0.08}
            stroke="#10b981"
            strokeOpacity={0.35}
            strokeDasharray="4 4"
            label={{ value: "舒适区", position: "insideTopLeft", fill: "#34d399", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "var(--chart-axis)" }}
            contentStyle={{
              background: "var(--chart-tooltip-bg, #071318)",
              border: "1px solid var(--chart-grid)",
              borderRadius: 12,
              color: "var(--chart-text, #f8fafc)",
              fontSize: 12,
            }}
            itemStyle={{ color: "var(--chart-text, #e2e8f0)" }}
            labelStyle={{ color: "var(--chart-axis)" }}
            formatter={(value, name) =>
              typeof value === "number" && Number.isFinite(value)
                ? [`${value.toFixed(1)}${name === "湿度" ? "%" : "°C"}`, name]
                : ["—", name]
            }
          />
          <Scatter data={points} fillOpacity={0.8} isAnimationActive={false}>
            {points.map((point) => (
              <Cell
                key={`${point.label}-${point.temperature}-${point.humidity}-${point.comfort}`}
                fill={point.color}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

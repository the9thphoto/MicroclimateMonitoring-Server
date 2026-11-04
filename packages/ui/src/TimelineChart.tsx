import { useId } from "react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TimelineDatum {
  time: number;
  label: string;
  value: number | null;
}

interface TimelineChartProps {
  points: TimelineDatum[];
  color: string;
  unit: string;
  selectedTime: number | null;
  selectedValue: number | null;
  height?: number;
  ariaLabel?: string;
}

function formatTime(time: number): string {
  return new Date(time).toLocaleString("zh-CN", { hour12: false });
}

export function TimelineChart({
  points,
  color,
  unit,
  selectedTime,
  selectedValue,
  height = 84,
  ariaLabel = "观测时间曲线",
}: TimelineChartProps) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div className="timeline-chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.38} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} hide />
          <YAxis dataKey="value" type="number" domain={["auto", "auto"]} hide />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.35)", strokeDasharray: "3 3" }}
            contentStyle={{
              background: "#071318",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "#f8fafc",
              fontSize: 12,
            }}
            labelStyle={{ color: "#94a3b8" }}
            labelFormatter={(value) => formatTime(Number(value))}
            formatter={(value) =>
              typeof value === "number" && Number.isFinite(value)
                ? [`${value.toFixed(1)} ${unit}`, "数值"]
                : ["—", "数值"]
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            connectNulls
            dot={false}
            isAnimationActive={false}
          />
          {selectedTime === null ? null : (
            <ReferenceLine x={selectedTime} stroke="rgba(255,255,255,0.6)" strokeDasharray="3 3" />
          )}
          {selectedTime === null || selectedValue === null ? null : (
            <ReferenceDot
              x={selectedTime}
              y={selectedValue}
              r={4}
              fill="#ffffff"
              stroke={color}
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

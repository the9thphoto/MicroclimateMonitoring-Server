import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AnalysisSeries {
  key: string;
  name: string;
  color: string;
  kind?: "line" | "area";
  axis?: "left" | "right";
  domain?: [number, number];
  dashed?: boolean;
}

export interface AnalysisDatum {
  label: string;
}

interface AnalysisChartProps {
  points: AnalysisDatum[];
  series: AnalysisSeries[];
  ariaLabel: string;
  height?: number;
}

export function AnalysisChart({ points, series, ariaLabel, height = 300 }: AnalysisChartProps) {
  const chartId = useId().replace(/:/g, "");
  const hasRightAxis = series.some((item) => item.axis === "right");
  const leftDomain = series.find((item) => item.axis !== "right" && item.domain)?.domain;
  const rightDomain = series.find((item) => item.axis === "right" && item.domain)?.domain;

  return (
    <div className="analysis-chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={points}
          margin={{ top: 8, right: hasRightAxis ? 8 : 16, bottom: 4, left: 0 }}
        >
          <defs>
            {series
              .filter((item) => item.kind === "area")
              .map((item) => (
                <linearGradient
                  key={item.key}
                  id={`${chartId}-${item.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={item.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={item.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            minTickGap={40}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            width={48}
            domain={leftDomain ?? ["auto", "auto"]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          {hasRightAxis ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              width={48}
              domain={rightDomain ?? ["auto", "auto"]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
          ) : null}
          <Tooltip
            contentStyle={{
              background: "#0b1f2a",
              border: "none",
              borderRadius: 12,
              color: "#f8fafc",
              fontSize: 12,
              boxShadow: "0 12px 28px rgb(8 24 32 / 30%)",
            }}
            itemStyle={{ color: "#e2e8f0" }}
            labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
            formatter={(value) =>
              typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—"
            }
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} iconType="circle" iconSize={8} />
          {series.map((item) =>
            item.kind === "area" ? (
              <Area
                key={item.key}
                yAxisId={item.axis === "right" ? "right" : "left"}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={item.color}
                strokeWidth={2}
                fill={`url(#${chartId}-${item.key})`}
                connectNulls
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={item.key}
                yAxisId={item.axis === "right" ? "right" : "left"}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray={item.dashed ? "5 4" : undefined}
                connectNulls
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

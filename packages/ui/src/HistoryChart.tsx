import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartPoint {
  label: string;
  temperature: number;
  humidity: number;
}

interface HistoryChartProps {
  points: ChartPoint[];
}

export function HistoryChart({ points }: HistoryChartProps) {
  return (
    <div className="history-chart" role="img" aria-label="温湿度趋势图">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
          <XAxis dataKey="label" minTickGap={40} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="temperature" tick={{ fontSize: 12 }} width={48} />
          <YAxis
            yAxisId="humidity"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            width={48}
          />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="temperature"
            type="monotone"
            dataKey="temperature"
            name="温度 (°C)"
            stroke="#d1495b"
            dot={false}
            strokeWidth={2}
          />
          <Line
            yAxisId="humidity"
            type="monotone"
            dataKey="humidity"
            name="湿度 (%)"
            stroke="#1d7a73"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

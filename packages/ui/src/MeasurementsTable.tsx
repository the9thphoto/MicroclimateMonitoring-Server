import type { components } from "@microclimate/contracts";

import { formatNumber, formatTime } from "./format";

type Measurement = components["schemas"]["Measurement"];

interface MeasurementsTableProps {
  rows: Measurement[];
}

export function MeasurementsTable({ rows }: MeasurementsTableProps) {
  return (
    <section className="measurements-table" aria-label="最近测量记录">
      <table>
        <caption>最近测量记录</caption>
        <thead>
          <tr>
            <th scope="col">采集时间</th>
            <th scope="col">温度 (°C)</th>
            <th scope="col">湿度 (%)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatTime(row.observed_at)}</td>
              <td>{formatNumber(row.temperature, 1)}</td>
              <td>{formatNumber(row.humidity, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

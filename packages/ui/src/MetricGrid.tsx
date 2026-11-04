import type { components } from "@microclimate/contracts";

import { formatNumber } from "./format";
import { KpiCard } from "./KpiCard";

export type Measurement = components["schemas"]["Measurement"];

interface MetricGridProps {
  measurement: Measurement | null;
}

export function MetricGrid({ measurement }: MetricGridProps) {
  return (
    <section className="metric-grid" aria-label="最新测量值">
      <KpiCard
        label="温度"
        value={formatNumber(measurement?.temperature, 1)}
        unit={measurement ? "°C" : undefined}
      />
      <KpiCard
        label="湿度"
        value={formatNumber(measurement?.humidity, 1)}
        unit={measurement ? "%" : undefined}
      />
      <KpiCard
        label="风速"
        value={formatNumber(measurement?.wind_speed, 1)}
        unit={measurement ? "m/s" : undefined}
      />
      <KpiCard
        label="风向"
        value={formatNumber(measurement?.wind_direction, 0)}
        unit={measurement ? "°" : undefined}
      />
      <KpiCard
        label="CO₂"
        value={formatNumber(measurement?.co2, 0)}
        unit={measurement ? "ppm" : undefined}
      />
      <KpiCard
        label="PM2.5"
        value={formatNumber(measurement?.pm25, 0)}
        unit={measurement ? "μg/m³" : undefined}
      />
      <KpiCard
        label="PM10"
        value={formatNumber(measurement?.pm10, 0)}
        unit={measurement ? "μg/m³" : undefined}
      />
    </section>
  );
}

import { EmptyState, HeatmapGrid } from "@microclimate/ui";
import { useMemo, useState } from "react";

import { type AnalysisPoint, buildHeatmap, type HeatmapMetric } from "../lib/analysis";
import { MetricTabs } from "./MetricTabs";

const COLORS: Record<HeatmapMetric, [string, string]> = {
  temperature: ["#dbeafe", "#dc2626"],
  humidity: ["#ecfeff", "#0f766e"],
};

const OPTIONS = [
  { key: "temperature", label: "温度" },
  { key: "humidity", label: "湿度" },
];

interface HeatmapPanelProps {
  points: AnalysisPoint[];
}

export function HeatmapPanel({ points }: HeatmapPanelProps) {
  const [metric, setMetric] = useState<HeatmapMetric>("temperature");
  const heatmap = useMemo(() => buildHeatmap(points, metric), [points, metric]);
  const digits = 1;
  const unit = metric === "temperature" ? "°C" : "%";

  return (
    <section className="panel" aria-labelledby="heatmap-heading">
      <div className="panel__head">
        <div>
          <h2 id="heatmap-heading">温湿日历</h2>
          <p className="panel__hint">按天 × 小时聚合，颜色代表该小时均值；空白格表示无采样。</p>
        </div>
        <MetricTabs
          options={OPTIONS}
          value={metric}
          onChange={(key) => setMetric(key as HeatmapMetric)}
          label="热力图指标"
        />
      </div>

      {heatmap.days.length === 0 ? (
        <EmptyState title="暂无热力图数据" description="当前区间没有可用于聚合的温湿度记录。" />
      ) : (
        <>
          <HeatmapGrid
            days={heatmap.days}
            cells={heatmap.cells}
            min={heatmap.min}
            max={heatmap.max}
            colors={COLORS[metric]}
            unit={unit}
            digits={digits}
            ariaLabel={`${metric === "temperature" ? "温度" : "湿度"}日历热力图，共 ${heatmap.days.length} 天`}
          />
          <p className="panel__note">
            热力图不插值；空格表示该小时没有有效采样，颜色越深表示数值越高。
          </p>
        </>
      )}
    </section>
  );
}

import { BoxPlot, type BoxPlotHour, EmptyState, formatNumber } from "@microclimate/ui";
import { useMemo, useState } from "react";

import { type AnalysisPoint, type BoxMetric, hourlyBoxPlot } from "../lib/analysis";
import { MetricTabs } from "./MetricTabs";

const OPTIONS = [
  { key: "temperature", label: "温度" },
  { key: "humidity", label: "湿度" },
];

interface BoxPlotPanelProps {
  points: AnalysisPoint[];
}

export function BoxPlotPanel({ points }: BoxPlotPanelProps) {
  const [metric, setMetric] = useState<BoxMetric>("temperature");
  const hours = useMemo(() => hourlyBoxPlot(points, metric), [points, metric]);
  const warmest = hours.reduce<BoxPlotHour | null>(
    (best, item) => (best === null || item.median > best.median ? item : best),
    null,
  );
  const coolest = hours.reduce<BoxPlotHour | null>(
    (best, item) => (best === null || item.median < best.median ? item : best),
    null,
  );
  const unit = metric === "temperature" ? "°C" : "%";
  const label = metric === "temperature" ? "温度" : "湿度";
  const color = metric === "temperature" ? "#e4572e" : "#0e7490";

  return (
    <section className="panel" aria-labelledby="boxplot-heading">
      <div className="panel__head">
        <div>
          <h2 id="boxplot-heading">分时分布</h2>
          <p className="panel__hint">按小时统计最小值、四分位、中位数与最大值，观察昼夜差异。</p>
        </div>
        <MetricTabs
          options={OPTIONS}
          value={metric}
          onChange={(key) => setMetric(key as BoxMetric)}
          label="分布指标"
        />
      </div>

      {hours.length === 0 ? (
        <EmptyState title="暂无分布数据" description="当前区间没有可用于分时统计的记录。" />
      ) : (
        <>
          <div className="insight-row">
            <div className="insight">
              <span className="insight__label">最高中位</span>
              <strong>{warmest?.label ?? "—"}</strong>
              <span>
                {formatNumber(warmest?.median, 1)} {unit}
              </span>
            </div>
            <div className="insight">
              <span className="insight__label">最低中位</span>
              <strong>{coolest?.label ?? "—"}</strong>
              <span>
                {formatNumber(coolest?.median, 1)} {unit}
              </span>
            </div>
            <div className="insight">
              <span className="insight__label">有效小时</span>
              <strong>{hours.length}</strong>
              <span>个时段</span>
            </div>
          </div>
          <BoxPlot hours={hours} unit={unit} label={label} color={color} digits={1} />
          <p className="panel__note">箱体为四分位范围，横线为中位数，须线为最小/最大值。</p>
        </>
      )}
    </section>
  );
}

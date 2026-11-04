import { AnalysisChart, formatNumber } from "@microclimate/ui";

import type { DiurnalInsight, HourlyPoint } from "../lib/analysis";

interface DiurnalPanelProps {
  profile: HourlyPoint[];
  insight: DiurnalInsight;
}

export function DiurnalPanel({ profile, insight }: DiurnalPanelProps) {
  return (
    <section className="panel" aria-labelledby="diurnal-heading">
      <div className="panel__head">
        <div>
          <h2 id="diurnal-heading">日内变化</h2>
          <p className="panel__hint">按小时聚合区间内的全部采样，用于观察昼夜节律。</p>
        </div>
        <span className="panel__tag">小时均值</span>
      </div>

      <div className="insight-row">
        <div className="insight">
          <span className="insight__label">最暖</span>
          <strong>{insight.warmest.label}</strong>
          <span>{formatNumber(insight.warmest.temperature, 1)} °C</span>
        </div>
        <div className="insight">
          <span className="insight__label">最凉</span>
          <strong>{insight.coolest.label}</strong>
          <span>{formatNumber(insight.coolest.temperature, 1)} °C</span>
        </div>
        <div className="insight">
          <span className="insight__label">最湿</span>
          <strong>{insight.mostHumid.label}</strong>
          <span>{formatNumber(insight.mostHumid.humidity, 1)} %</span>
        </div>
      </div>

      <AnalysisChart
        points={profile}
        height={220}
        ariaLabel="按小时聚合的温度与湿度变化图"
        series={[
          {
            key: "temperature",
            name: "温度 (°C)",
            color: "#e4572e",
            kind: "area",
            axis: "left",
          },
          {
            key: "humidity",
            name: "湿度 (%)",
            color: "#0284c7",
            axis: "right",
            domain: [0, 100],
          },
        ]}
      />
    </section>
  );
}

import {
  AnalysisChart,
  type AnalysisSeries,
  EmptyState,
  formatNumber,
  Skeleton,
} from "@microclimate/ui";
import { useMemo, useState } from "react";

import type { AnalysisPoint, MetricKey } from "../lib/analysis";
import { summarizeMetric } from "../lib/analysis";
import { MetricTabs } from "./MetricTabs";

type GroupKey = "temp" | "comfort" | "air" | "wind";

interface TrendSeries extends AnalysisSeries {
  metric: MetricKey;
}

interface TrendGroup {
  key: GroupKey;
  label: string;
  description: string;
  series: TrendSeries[];
}

const GROUPS: TrendGroup[] = [
  {
    key: "temp",
    label: "温湿度",
    description: "温度使用左侧坐标，湿度使用右侧百分比坐标。",
    series: [
      {
        key: "temperature",
        metric: "temperature",
        name: "温度 (°C)",
        color: "#e4572e",
        kind: "area",
        axis: "left",
      },
      {
        key: "humidity",
        metric: "humidity",
        name: "湿度 (%)",
        color: "#0284c7",
        axis: "right",
        domain: [0, 100],
      },
    ],
  },
  {
    key: "comfort",
    label: "露点与体感",
    description: "露点和温湿指数均由温度与相对湿度推导。",
    series: [
      {
        key: "temperature",
        metric: "temperature",
        name: "温度 (°C)",
        color: "#e4572e",
        kind: "area",
        axis: "left",
      },
      {
        key: "dewPoint",
        metric: "dewPoint",
        name: "露点 (°C)",
        color: "#0d9488",
        dashed: true,
      },
      {
        key: "thi",
        metric: "thi",
        name: "温湿指数",
        color: "#8b5cf6",
        dashed: true,
      },
    ],
  },
  {
    key: "air",
    label: "空气质量",
    description: "颗粒物使用左侧浓度坐标，CO₂ 使用右侧 ppm 坐标。",
    series: [
      {
        key: "pm25",
        metric: "pm25",
        name: "PM2.5 (μg/m³)",
        color: "#f59e0b",
        axis: "left",
      },
      {
        key: "pm10",
        metric: "pm10",
        name: "PM10 (μg/m³)",
        color: "#ef4444",
        axis: "left",
      },
      {
        key: "co2",
        metric: "co2",
        name: "CO₂ (ppm)",
        color: "#64748b",
        axis: "right",
        dashed: true,
      },
    ],
  },
  {
    key: "wind",
    label: "风速",
    description: "按所选区间展示风速采样，缺失值保持断开。",
    series: [
      {
        key: "windSpeed",
        metric: "windSpeed",
        name: "风速 (m/s)",
        color: "#0e7490",
        kind: "area",
        axis: "left",
      },
    ],
  },
];

interface TrendPanelProps {
  station: string;
  points: AnalysisPoint[];
  statsPoints: AnalysisPoint[];
  loading: boolean;
}

export function TrendPanel({ station, points, statsPoints, loading }: TrendPanelProps) {
  const [requestedGroup, setRequestedGroup] = useState<GroupKey>("temp");
  const availability = useMemo(
    () => ({
      temp: statsPoints.length > 0,
      comfort: statsPoints.length > 0,
      air: statsPoints.some(
        (point) => point.pm25 !== null || point.pm10 !== null || point.co2 !== null,
      ),
      wind: statsPoints.some((point) => point.windSpeed !== null),
    }),
    [statsPoints],
  );
  const activeGroup =
    GROUPS.find((group) => group.key === requestedGroup && availability[group.key]) ?? GROUPS[0];
  if (!activeGroup) {
    return null;
  }

  const tabs = GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    disabled: !availability[group.key],
  }));

  const stats = activeGroup.series.map((series) => ({
    series,
    summary: summarizeMetric(statsPoints, series.metric),
  }));

  return (
    <section className="panel panel--trend" aria-labelledby="trend-heading">
      <div className="panel__head">
        <div>
          <h2 id="trend-heading">趋势分析</h2>
          <p className="panel__hint">{activeGroup.description}</p>
        </div>
        <MetricTabs
          options={tabs}
          value={activeGroup.key}
          onChange={(key) => setRequestedGroup(key as GroupKey)}
        />
      </div>

      {loading ? (
        <Skeleton />
      ) : statsPoints.length === 0 ? (
        <EmptyState
          title="暂无历史数据"
          description={`站点 ${station} 在当前时间范围内没有记录。`}
        />
      ) : !availability[activeGroup.key] ? (
        <EmptyState
          title="暂无该类数据"
          description="该区间没有对应传感器的读数，可能是传感器尚未接入。"
        />
      ) : (
        <div className="trend-layout">
          <div className="trend-chart">
            <AnalysisChart
              points={points}
              series={activeGroup.series}
              height={330}
              ariaLabel={`${activeGroup.label}趋势图`}
            />
          </div>
          <aside className="trend-stats" aria-label="区间统计摘要">
            {stats.map(({ series, summary }) => (
              <div className="trend-stat" key={series.key}>
                <span className="trend-stat__name">
                  <i style={{ background: series.color }} aria-hidden="true" />
                  {series.name}
                </span>
                {summary ? (
                  <>
                    <strong>
                      {formatNumber(summary.avg, summary.digits)}
                      <small>{summary.unit}</small>
                    </strong>
                    <span className="trend-stat__range">
                      低 {formatNumber(summary.min, summary.digits)} · 高{" "}
                      {formatNumber(summary.max, summary.digits)}
                    </span>
                    <span className="trend-stat__count">{summary.count} 个有效采样</span>
                  </>
                ) : (
                  <span className="trend-stat__empty">该区间无有效数据</span>
                )}
              </div>
            ))}
          </aside>
        </div>
      )}
    </section>
  );
}

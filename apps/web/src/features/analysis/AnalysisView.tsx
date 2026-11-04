import type { Measurement } from "@microclimate/api-client";
import {
  BoxPlot,
  ComfortScatter,
  CorrelationMatrix,
  EmptyState,
  formatNumber,
  HeatmapGrid,
  MeasurementsTable,
  WindRose,
} from "@microclimate/ui";
import { useMemo, useState } from "react";

import type { AnalysisPoint, DataQuality } from "../../lib/analysis";
import {
  buildHeatmap,
  COMFORT_COLORS,
  COMFORT_LEGEND,
  comfortFromThi,
  comfortZoneShare,
  correlationMatrix,
  hourlyBoxPlot,
  windRose,
} from "../../lib/analysis";
import { RANGE_OPTIONS, type RangeKey } from "../../lib/ranges";
import type { AnalysisTab } from "../../lib/urlState";
import { ChevronLeftIcon } from "../shell/icons";

const TABS: { id: AnalysisTab; label: string }[] = [
  { id: "heatmap", label: "温湿日历" },
  { id: "box", label: "分时分布" },
  { id: "correlation", label: "要素相关" },
  { id: "windrose", label: "风玫瑰" },
  { id: "comfort", label: "舒适度" },
  { id: "data", label: "原始数据" },
];

interface AnalysisViewProps {
  station: string;
  range: RangeKey;
  tab: AnalysisTab;
  rows: Measurement[];
  points: AnalysisPoint[];
  chartPoints: AnalysisPoint[];
  quality: DataQuality;
  onBack: () => void;
  onPickStation: () => void;
  onRangeChange: (range: RangeKey) => void;
  onTabChange: (tab: AnalysisTab) => void;
}

export function AnalysisView({
  station,
  range,
  tab,
  rows,
  points,
  chartPoints,
  quality,
  onBack,
  onPickStation,
  onRangeChange,
  onTabChange,
}: AnalysisViewProps) {
  const [heatmapMetric, setHeatmapMetric] = useState<"temperature" | "humidity">("temperature");
  const [boxMetric, setBoxMetric] = useState<"temperature" | "humidity">("temperature");

  const heatmap = useMemo(() => buildHeatmap(points, heatmapMetric), [points, heatmapMetric]);
  const boxHours = useMemo(() => hourlyBoxPlot(points, boxMetric), [points, boxMetric]);
  const correlation = useMemo(() => correlationMatrix(points), [points]);
  const windBins = useMemo(() => windRose(rows), [rows]);
  const comfortPoints = useMemo(
    () =>
      chartPoints
        .filter((point) => point.temperature !== null && point.humidity !== null)
        .map((point) => {
          const comfort = comfortFromThi(point.thi);
          return {
            label: point.fullLabel,
            temperature: point.temperature ?? 0,
            humidity: point.humidity ?? 0,
            comfort: comfort.label,
            color: COMFORT_COLORS[comfort.key],
          };
        }),
    [chartPoints],
  );
  const comfortShare = useMemo(() => comfortZoneShare(chartPoints), [chartPoints]);
  const coverage = Math.round(quality.coverage * 100);

  return (
    <main className="analysis-page">
      <header className="analysis-page__head">
        <button type="button" className="button button--ghost" onClick={onBack}>
          <ChevronLeftIcon size={17} />
          返回地图
        </button>
        <div className="analysis-page__title">
          <p className="eyebrow">RESEARCH</p>
          <h1>分析工作台</h1>
          <button type="button" className="text-button" onClick={onPickStation}>
            {station}
          </button>
        </div>
        <div className="analysis-page__summary">
          <span>{rows.length} 条观测</span>
          <span>{coverage}% 覆盖</span>
          <span>最大间隔 {quality.maxGapMinutes} 分钟</span>
        </div>
      </header>

      <div className="analysis-page__controls">
        <div className="segmented" role="toolbar" aria-label="时间范围">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={option.key === range ? "segmented__item is-active" : "segmented__item"}
              aria-pressed={option.key === range}
              onClick={() => onRangeChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="analysis-page__tabs" role="tablist" aria-label="分析视图">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === tab}
            className={item.id === tab ? "analysis-tab is-active" : "analysis-tab"}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="analysis-panel" aria-label={TABS.find((item) => item.id === tab)?.label}>
        {tab === "heatmap" ? (
          <>
            <div className="analysis-panel__head">
              <div>
                <h3>温湿日历</h3>
                <p>按天 × 小时聚合；空白格表示无采样。</p>
              </div>
              <div className="segmented" role="toolbar" aria-label="图层指标">
                {(["temperature", "humidity"] as const).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    className={
                      heatmapMetric === metric ? "segmented__item is-active" : "segmented__item"
                    }
                    aria-pressed={heatmapMetric === metric}
                    onClick={() => setHeatmapMetric(metric)}
                  >
                    {metric === "temperature" ? "温度" : "湿度"}
                  </button>
                ))}
              </div>
            </div>
            {heatmap.days.length === 0 ? (
              <EmptyState title="暂无热力图数据" description="当前区间没有可用于聚合的记录。" />
            ) : (
              <HeatmapGrid
                days={heatmap.days}
                cells={heatmap.cells}
                min={heatmap.min}
                max={heatmap.max}
                colors={
                  heatmapMetric === "temperature" ? ["#dbeafe", "#dc2626"] : ["#ecfeff", "#0f766e"]
                }
                unit={heatmapMetric === "temperature" ? "°C" : "%"}
                digits={1}
                ariaLabel={`${heatmapMetric === "temperature" ? "温度" : "湿度"}日历热力图`}
              />
            )}
          </>
        ) : null}

        {tab === "box" ? (
          <>
            <div className="analysis-panel__head">
              <div>
                <h3>分时分布</h3>
                <p>按小时统计最小值、四分位、中位数与最大值。</p>
              </div>
              <div className="segmented" role="toolbar" aria-label="图层指标">
                {(["temperature", "humidity"] as const).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    className={
                      boxMetric === metric ? "segmented__item is-active" : "segmented__item"
                    }
                    aria-pressed={boxMetric === metric}
                    onClick={() => setBoxMetric(metric)}
                  >
                    {metric === "temperature" ? "温度" : "湿度"}
                  </button>
                ))}
              </div>
            </div>
            {boxHours.length === 0 ? (
              <EmptyState title="暂无分布数据" description="当前区间没有可用于分时统计的记录。" />
            ) : (
              <>
                <div className="analysis-kpis">
                  <div>
                    <span>最高中位</span>
                    <strong>
                      {formatNumber(Math.max(...boxHours.map((item) => item.median)), 1)}
                    </strong>
                  </div>
                  <div>
                    <span>最低中位</span>
                    <strong>
                      {formatNumber(Math.min(...boxHours.map((item) => item.median)), 1)}
                    </strong>
                  </div>
                  <div>
                    <span>有效小时</span>
                    <strong>{boxHours.length}</strong>
                  </div>
                </div>
                <BoxPlot
                  hours={boxHours}
                  unit={boxMetric === "temperature" ? "°C" : "%"}
                  label={boxMetric === "temperature" ? "温度" : "湿度"}
                  color={boxMetric === "temperature" ? "#fb7185" : "#38bdf8"}
                />
              </>
            )}
          </>
        ) : null}

        {tab === "correlation" ? (
          <>
            <div className="analysis-panel__head">
              <div>
                <h3>要素相关</h3>
                <p>Pearson 相关系数，仅使用共同有效样本（≥3）。</p>
              </div>
            </div>
            {correlation.metrics.length < 2 ? (
              <EmptyState title="样本不足" description="至少需要两个字段各有 3 条有效记录。" />
            ) : (
              <CorrelationMatrix metrics={correlation.metrics} values={correlation.values} />
            )}
            <p className="analysis-note">相关不等于因果；单站时序相关只反映共同变化。</p>
          </>
        ) : null}

        {tab === "windrose" ? (
          <>
            <div className="analysis-panel__head">
              <div>
                <h3>风玫瑰</h3>
                <p>花瓣长度表示出现次数，颜色表示平均风速。</p>
              </div>
            </div>
            {windBins ? (
              <div className="analysis-windrose">
                <WindRose bins={windBins} size={320} />
              </div>
            ) : (
              <EmptyState title="暂无风数据" description="该站点没有同时具备风速和风向的采样。" />
            )}
          </>
        ) : null}

        {tab === "comfort" ? (
          <>
            <div className="analysis-panel__head">
              <div>
                <h3>舒适度分布</h3>
                <p>每个点代表一条观测，颜色表示体感等级。</p>
              </div>
              <strong className="analysis-percent">
                {comfortShare === null ? "—" : `${Math.round(comfortShare * 100)}%`}
                <small> 舒适区占比</small>
              </strong>
            </div>
            <ComfortScatter points={comfortPoints} />
            <ul className="comfort-legend">
              {COMFORT_LEGEND.map((item) => (
                <li key={item.key}>
                  <i style={{ background: item.color }} aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === "data" ? (
          <>
            <div className="analysis-panel__head">
              <div>
                <h3>原始数据</h3>
                <p>最近 100 条测量记录，按采集时间倒序。</p>
              </div>
            </div>
            {rows.length > 0 ? (
              <MeasurementsTable rows={rows.slice(0, 100)} />
            ) : (
              <EmptyState title="暂无数据" description="该站点在当前区间没有记录。" />
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}

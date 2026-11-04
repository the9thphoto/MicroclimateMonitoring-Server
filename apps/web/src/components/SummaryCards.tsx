import { formatNumber, Sparkline } from "@microclimate/ui";

import { comfortFromThi, type MetricSummary } from "../lib/analysis";

interface SummaryCardsProps {
  temperature: MetricSummary | null;
  humidity: MetricSummary | null;
  thi: MetricSummary | null;
  temperatureSeries: (number | null)[];
  humiditySeries: (number | null)[];
  thiSeries: (number | null)[];
  samples: number;
  rangeLabel: string;
}

function changeLabel(change: number, unit: string): { text: string; tone: "up" | "down" | "flat" } {
  if (Math.abs(change) < 0.05) {
    return { text: "持平", tone: "flat" };
  }
  return {
    text: `${change > 0 ? "+" : ""}${change.toFixed(1)}${unit}`,
    tone: change > 0 ? "up" : "down",
  };
}

export function SummaryCards({
  temperature,
  humidity,
  thi,
  temperatureSeries,
  humiditySeries,
  thiSeries,
  samples,
  rangeLabel,
}: SummaryCardsProps) {
  const temperatureChange = temperature ? changeLabel(temperature.change, "°C") : null;
  const humidityChange = humidity ? changeLabel(humidity.change, "%") : null;
  const comfort = thi ? comfortFromThi(thi.avg) : null;

  return (
    <section className="summary-grid" aria-label="区间统计">
      <article className="summary-card">
        <div className="summary-card__head">
          <span className="summary-card__label">平均温度</span>
          <span
            className={`summary-card__trend summary-card__trend--${temperatureChange?.tone ?? "flat"}`}
          >
            {temperatureChange ? `区间 ${temperatureChange.text}` : "暂无数据"}
          </span>
        </div>
        <p className="summary-card__value">
          {formatNumber(temperature?.avg, 1)}
          {temperature ? <small>°C</small> : null}
        </p>
        <div className="summary-card__spark">
          <Sparkline values={temperatureSeries} color="#e4572e" />
        </div>
        <p className="summary-card__meta">
          最低 {formatNumber(temperature?.min, 1)} · 最高 {formatNumber(temperature?.max, 1)} °C
        </p>
      </article>

      <article className="summary-card">
        <div className="summary-card__head">
          <span className="summary-card__label">平均湿度</span>
          <span
            className={`summary-card__trend summary-card__trend--${humidityChange?.tone ?? "flat"}`}
          >
            {humidityChange ? `区间 ${humidityChange.text}` : "暂无数据"}
          </span>
        </div>
        <p className="summary-card__value">
          {formatNumber(humidity?.avg, 1)}
          {humidity ? <small>%</small> : null}
        </p>
        <div className="summary-card__spark">
          <Sparkline values={humiditySeries} color="#0284c7" />
        </div>
        <p className="summary-card__meta">
          最低 {formatNumber(humidity?.min, 1)} · 最高 {formatNumber(humidity?.max, 1)} %
        </p>
      </article>

      <article className="summary-card">
        <div className="summary-card__head">
          <span className="summary-card__label">温湿指数</span>
          <span className="summary-card__badge">{comfort?.label ?? "暂无数据"}</span>
        </div>
        <p className="summary-card__value">{formatNumber(thi?.avg, 1)}</p>
        <div className="summary-card__spark">
          <Sparkline values={thiSeries} color="#0d9488" />
        </div>
        <p className="summary-card__meta">基于温度与相对湿度的体感参考</p>
      </article>

      <article className="summary-card summary-card--quiet">
        <div className="summary-card__head">
          <span className="summary-card__label">区间样本</span>
          <span className="summary-card__badge">{rangeLabel}</span>
        </div>
        <p className="summary-card__value">
          {samples}
          <small>条</small>
        </p>
        <p className="summary-card__meta">图表最多抽取 360 个采样点</p>
      </article>
    </section>
  );
}

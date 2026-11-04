import { formatNumber, Sparkline } from "@microclimate/ui";
import type { CSSProperties } from "react";

import type { AnalysisPoint, DataQuality } from "../../lib/analysis";
import {
  absoluteHumidity,
  airQualityFromAqi,
  comfortFromThi,
  windDirectionLabel,
} from "../../lib/analysis";
import type { LayerDefinition } from "../../lib/layers";
import { formatLayerValue, layerColor } from "../../lib/layers";
import { formatCoordinates, type StationLocation } from "../../lib/location";

interface StationContentProps {
  station: string;
  point: AnalysisPoint | null;
  values: AnalysisPoint[];
  layer: LayerDefinition;
  quality: DataQuality;
  location: StationLocation | null;
}

function metricValue(value: number | null, digits: number, unit: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "未接入";
  }
  return `${formatNumber(value, digits)}${unit ? ` ${unit}` : ""}`;
}

export function StationContent({
  station,
  point,
  values,
  layer,
  quality,
  location,
}: StationContentProps) {
  const value = point ? layer.valueOf(point) : null;
  const color = layerColor(layer, value);
  const index = point ? values.findIndex((item) => item.time === point.time) : -1;
  const previous = index > 0 ? values[index - 1] : undefined;
  const previousValue = previous ? layer.valueOf(previous) : null;
  const delta = value !== null && previousValue !== null ? value - previousValue : null;
  const comfort = comfortFromThi(point?.thi ?? null);
  const air = point?.aqi !== null && point?.aqi !== undefined ? airQualityFromAqi(point.aqi) : null;
  const windDirection = windDirectionLabel(point?.windDirection ?? null);
  const absolute = point ? absoluteHumidity(point.temperature ?? 0, point.humidity ?? 0) : null;
  const coverage = Math.round(quality.coverage * 100);

  return (
    <div className="station-content">
      <section className="station-hero" style={{ "--layer-color": color } as CSSProperties}>
        <div className="station-hero__top">
          <span>{layer.label}</span>
          <span className="source-badge">观测</span>
        </div>
        <p className="station-hero__value">{formatLayerValue(layer, value)}</p>
        <div className="station-hero__meta">
          <span>{point?.fullLabel ?? "暂无观测"}</span>
          {delta !== null ? (
            <span className={delta >= 0 ? "delta is-up" : "delta is-down"}>
              {delta >= 0 ? "+" : ""}
              {formatNumber(delta, layer.digits)} {layer.unit}
            </span>
          ) : null}
        </div>
        <div className="station-hero__spark">
          <Sparkline values={values.map((item) => layer.valueOf(item))} color={color} height={40} />
        </div>
      </section>

      <section className="station-block">
        <div className="station-block__head">
          <h3>次要要素</h3>
          <span>{comfort.label}</span>
        </div>
        <dl className="station-metrics">
          <div>
            <dt>相对湿度</dt>
            <dd>{metricValue(point?.humidity ?? null, 1, "%")}</dd>
          </div>
          <div>
            <dt>露点</dt>
            <dd>{metricValue(point?.dewPoint ?? null, 1, "°C")}</dd>
          </div>
          <div>
            <dt>温湿指数</dt>
            <dd>{metricValue(point?.thi ?? null, 1, "")}</dd>
          </div>
          <div>
            <dt>绝对湿度</dt>
            <dd>{metricValue(absolute, 1, "g/m³")}</dd>
          </div>
          <div>
            <dt>风速</dt>
            <dd>{metricValue(point?.windSpeed ?? null, 1, "m/s")}</dd>
          </div>
          <div>
            <dt>风向</dt>
            <dd>{windDirection ?? "未接入"}</dd>
          </div>
          <div>
            <dt>空气质量</dt>
            <dd>{air ? `${point?.aqi} ${air.label}` : "未接入"}</dd>
          </div>
          <div>
            <dt>CO₂</dt>
            <dd>{metricValue(point?.co2 ?? null, 0, "ppm")}</dd>
          </div>
        </dl>
      </section>

      <section className="station-block">
        <div className="station-block__head">
          <h3>站点与数据质量</h3>
          <span>{coverage}% 覆盖</span>
        </div>
        <div className="station-facts">
          <div>
            <span>站点</span>
            <strong>{station}</strong>
          </div>
          <div>
            <span>坐标</span>
            <strong>{formatCoordinates(location)}</strong>
          </div>
          <div>
            <span>有效采样</span>
            <strong>{quality.count}</strong>
          </div>
          <div>
            <span>最大间隔</span>
            <strong>{quality.maxGapMinutes} 分钟</strong>
          </div>
        </div>
        <div className="coverage-bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, coverage)}%` }} />
        </div>
        <p className="station-note">
          {coverage >= 80
            ? "采样密度充足，当前范围统计具有代表性。"
            : "覆盖率偏低，回放和统计只反映已有采样。"}
        </p>
      </section>
    </div>
  );
}

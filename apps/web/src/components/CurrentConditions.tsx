import type { Measurement } from "@microclimate/api-client";
import { ComfortGauge, formatNumber, formatTime, type GaugeSegment } from "@microclimate/ui";

import { absoluteHumidity, ageLabel, comfortFromThi, dewPoint, thi } from "../lib/analysis";

const GAUGE_SEGMENTS: GaugeSegment[] = [
  { from: 0, to: 10, color: "#38bdf8", label: "寒冷" },
  { from: 10, to: 17, color: "#22d3ee", label: "偏凉" },
  { from: 17, to: 24, color: "#10b981", label: "舒适" },
  { from: 24, to: 28, color: "#f59e0b", label: "偏暖" },
  { from: 28, to: 32, color: "#f97316", label: "闷热" },
  { from: 32, to: 40, color: "#ef4444", label: "酷热" },
];

interface CurrentConditionsProps {
  station: string;
  measurement: Measurement | null;
  loading: boolean;
}

export function CurrentConditions({ station, measurement, loading }: CurrentConditionsProps) {
  const dew = measurement ? dewPoint(measurement.temperature, measurement.humidity) : null;
  const thix = measurement ? thi(measurement.temperature, measurement.humidity) : null;
  const absolute = measurement
    ? absoluteHumidity(measurement.temperature, measurement.humidity)
    : null;
  const comfort = comfortFromThi(thix);
  const humidity = measurement?.humidity ?? null;

  return (
    <section className="hero" aria-labelledby="current-heading">
      <div className="hero__head">
        <div>
          <h2 className="hero__eyebrow" id="current-heading">
            当前观测
          </h2>
          <p className="hero__station">
            <span className="status-dot" aria-hidden="true" />
            {station}
          </p>
        </div>
        <span className="hero__stamp" aria-live="polite">
          {loading
            ? "同步中"
            : measurement
              ? `采集于 ${formatTime(measurement.observed_at)}`
              : "等待数据"}
        </span>
      </div>

      <div className="hero__body">
        <div className="hero__primary">
          {loading ? (
            <>
              <div className="hero__skeleton" aria-hidden="true">
                <span />
                <span />
              </div>
              <p className="hero__advice">正在读取最新观测…</p>
            </>
          ) : measurement ? (
            <>
              <div className="hero__reading">
                <span className="hero__temp">
                  {formatNumber(measurement.temperature, 1)}
                  <span className="hero__degree">°C</span>
                </span>
                <span className={`comfort-pill comfort-pill--${comfort.key}`}>{comfort.label}</span>
              </div>
              <p className="hero__advice">{comfort.advice}</p>
              <div className="hero__facts">
                <span>
                  温湿指数 <strong>{formatNumber(thix, 1)}</strong>
                </span>
                <span>
                  露点 <strong>{formatNumber(dew, 1)} °C</strong>
                </span>
                <span>
                  数据时效 <strong>{ageLabel(measurement.observed_at)}</strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="hero__empty">暂无数据</p>
              <p className="hero__advice">该站点尚未上报测量，或站点标识不存在。</p>
            </>
          )}
        </div>

        <div className="hero__side">
          <div className="hero__gauge">
            <ComfortGauge
              value={thix}
              segments={GAUGE_SEGMENTS}
              min={0}
              max={40}
              label="温湿指数"
            />
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">相对湿度</span>
            <span className="hero-stat__value">
              {measurement ? formatNumber(humidity, 1) : "—"}
              {measurement ? <small>%</small> : null}
            </span>
            <span className="hero-stat__bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.max(0, humidity ?? 0))}%` }} />
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">露点温度</span>
            <span className="hero-stat__value">
              {measurement ? formatNumber(dew, 1) : "—"}
              {measurement ? <small>°C</small> : null}
            </span>
            <span className="hero-stat__hint">空气凝结温度</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">绝对湿度</span>
            <span className="hero-stat__value">
              {measurement ? formatNumber(absolute, 1) : "—"}
              {measurement ? <small>g/m³</small> : null}
            </span>
            <span className="hero-stat__hint">单位体积水汽质量</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">温湿指数</span>
            <span className="hero-stat__value">{measurement ? formatNumber(thix, 1) : "—"}</span>
            <span className="hero-stat__hint">体感参考值</span>
          </div>
        </div>
      </div>
    </section>
  );
}

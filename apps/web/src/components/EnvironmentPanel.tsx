import { AqiScale, formatNumber, WindRose, type WindRoseBin } from "@microclimate/ui";

import type { EnvironmentSnapshot } from "../lib/analysis";

interface EnvironmentPanelProps {
  snapshot: EnvironmentSnapshot;
  windRose: WindRoseBin[] | null;
}

export function EnvironmentPanel({ snapshot, windRose }: EnvironmentPanelProps) {
  const { wind, air, co2, sensors } = snapshot;

  return (
    <section className="panel" aria-labelledby="environment-heading">
      <div className="panel__head">
        <div>
          <h2 id="environment-heading">环境要素</h2>
          <p className="panel__hint">未接入的传感器保持占位，不参与任何推导。</p>
        </div>
      </div>

      <div className="env-grid">
        <article className="env-card env-card--wind">
          <span className="env-card__label">风况</span>
          {wind ? (
            <>
              <p className="env-card__value">
                {formatNumber(wind.averageSpeed, 1)}
                <small>m/s</small>
              </p>
              <p className="env-card__meta">
                最大 {formatNumber(wind.maxSpeed, 1)} m/s · 风向 {wind.directionLabel ?? "—"}
                {wind.beaufort ? ` · ${wind.beaufort.level} 级${wind.beaufort.label}` : ""}
              </p>
              {windRose ? (
                <WindRose bins={windRose} size={200} />
              ) : (
                <p className="env-card__missing">风向数据不足，无法绘制风玫瑰。</p>
              )}
            </>
          ) : (
            <>
              <p className="env-card__value env-card__value--muted">—</p>
              <p className="env-card__meta">未接入风速传感器</p>
            </>
          )}
        </article>

        <article className="env-card env-card--air">
          <span className="env-card__label">空气质量</span>
          {air ? (
            <>
              <p className="env-card__value">
                {air.aqi}
                <small>AQI</small>
              </p>
              <p className="env-card__meta">
                <span className={`air-badge air-badge--${air.quality.tone}`}>
                  {air.quality.label}
                </span>
                PM2.5 {formatNumber(air.pm25, 0)} · PM10 {formatNumber(air.pm10, 0)}
              </p>
              <AqiScale value={air.aqi} label={air.quality.label} tone={air.quality.tone} />
            </>
          ) : (
            <>
              <p className="env-card__value env-card__value--muted">—</p>
              <p className="env-card__meta">未接入颗粒物传感器</p>
            </>
          )}
        </article>

        <article className="env-card">
          <span className="env-card__label">CO₂</span>
          {co2 ? (
            <>
              <p className="env-card__value">
                {formatNumber(co2.average, 0)}
                <small>ppm</small>
              </p>
              <p className="env-card__meta">
                {co2.level} · 峰值 {formatNumber(co2.max, 0)} ppm
              </p>
            </>
          ) : (
            <>
              <p className="env-card__value env-card__value--muted">—</p>
              <p className="env-card__meta">未接入二氧化碳传感器</p>
            </>
          )}
        </article>
      </div>

      <ul className="sensor-list" aria-label="传感器接入情况">
        <li className={sensors.wind ? "is-on" : undefined}>
          风速 {sensors.wind ? "已接入" : "未接入"}
        </li>
        <li className={sensors.particulates ? "is-on" : undefined}>
          颗粒物 {sensors.particulates ? "已接入" : "未接入"}
        </li>
        <li className={sensors.co2 ? "is-on" : undefined}>
          CO₂ {sensors.co2 ? "已接入" : "未接入"}
        </li>
      </ul>

      {air ? <p className="panel__note">AQI 由区间颗粒物均值换算，仅作趋势参考。</p> : null}
    </section>
  );
}

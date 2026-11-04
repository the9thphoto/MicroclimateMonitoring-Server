import { ApiError } from "@microclimate/api-client";
import { ErrorBanner, formatTime, MeasurementsTable, RangeTabs } from "@microclimate/ui";
import { type FormEvent, useMemo, useState } from "react";

import { BoxPlotPanel } from "./components/BoxPlotPanel";
import { ComfortPanel } from "./components/ComfortPanel";
import { CorrelationPanel } from "./components/CorrelationPanel";
import { CurrentConditions } from "./components/CurrentConditions";
import { DataQualityPanel } from "./components/DataQualityPanel";
import { DiurnalPanel } from "./components/DiurnalPanel";
import { EnvironmentPanel } from "./components/EnvironmentPanel";
import { HeatmapPanel } from "./components/HeatmapPanel";
import { StationMapPanel } from "./components/StationMapPanel";
import { SummaryCards } from "./components/SummaryCards";
import { TrendPanel } from "./components/TrendPanel";
import { useHistory } from "./hooks/useHistory";
import { useLatest } from "./hooks/useLatest";
import {
  dataQuality,
  diurnalInsight,
  environmentSnapshot,
  hourlyProfile,
  summarizeMetric,
  toAnalysisPoints,
  windRose,
} from "./lib/analysis";
import { isRangeKey, RANGE_OPTIONS, type RangeKey } from "./lib/ranges";
import { stationFromSearch, stationSearch } from "./lib/station";

function errorMessage(error: Error): string {
  if (error instanceof ApiError) {
    return `${error.status}: ${error.detail}`;
  }
  return "无法加载数据，请检查 API 与数据库连接。";
}

export function App() {
  const [station, setStation] = useState(() => stationFromSearch(window.location.search));
  const [draft, setDraft] = useState(station);
  const [range, setRange] = useState<RangeKey>("24h");

  const latest = useLatest(station);
  const history = useHistory(station, range);
  const rows = useMemo(() => history.data ?? [], [history.data]);
  const rangeOption = RANGE_OPTIONS.find((option) => option.key === range) ?? RANGE_OPTIONS[2];
  const rangeMs = rangeOption?.milliseconds ?? 24 * 60 * 60 * 1000;
  const rangeLabel = rangeOption?.label ?? "24 小时";

  const allPoints = useMemo(
    () => toAnalysisPoints(rows, rangeMs, Math.max(rows.length, 1)),
    [rows, rangeMs],
  );
  const chartPoints = useMemo(() => toAnalysisPoints(rows, rangeMs), [rows, rangeMs]);
  const temperature = useMemo(() => summarizeMetric(allPoints, "temperature"), [allPoints]);
  const humidity = useMemo(() => summarizeMetric(allPoints, "humidity"), [allPoints]);
  const thi = useMemo(() => summarizeMetric(allPoints, "thi"), [allPoints]);
  const profile = useMemo(() => hourlyProfile(allPoints), [allPoints]);
  const insight = useMemo(() => diurnalInsight(profile), [profile]);
  const snapshot = useMemo(() => environmentSnapshot(rows), [rows]);
  const quality = useMemo(() => dataQuality(rows, rangeMs), [rows, rangeMs]);
  const windBins = useMemo(() => windRose(rows), [rows]);
  const temperatureSeries = useMemo(() => allPoints.map((point) => point.temperature), [allPoints]);
  const humiditySeries = useMemo(() => allPoints.map((point) => point.humidity), [allPoints]);
  const thiSeries = useMemo(() => allPoints.map((point) => point.thi), [allPoints]);
  const error = latest.error ?? history.error;
  const isRefreshing = latest.isFetching || history.isFetching;
  const updatedAt = latest.data?.observed_at ?? null;

  const applyStation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next) {
      return;
    }
    setStation(next);
    const search = stationSearch(window.location.search, next);
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  };

  const retry = () => {
    void latest.refetch();
    void history.refetch();
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              role="presentation"
            >
              <path d="M4 8h9a2.5 2.5 0 1 0-2.4-3.2" strokeLinecap="round" />
              <path d="M3 12h13a2.5 2.5 0 1 1-2.4 3.2" strokeLinecap="round" />
              <path d="M5 16h5" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="app__eyebrow">Campus Microclimate</p>
            <h1>气象分析面板</h1>
            <p className="app__subtitle">校园微气候观测 · {station}</p>
          </div>
        </div>

        <div className="app__controls">
          <form className="station-form" onSubmit={applyStation}>
            <label htmlFor="station">站点</label>
            <input
              id="station"
              name="station"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="station-01"
              autoComplete="off"
            />
            <button type="submit">应用</button>
          </form>
          <button
            type="button"
            className="refresh-button"
            onClick={retry}
            disabled={isRefreshing}
            aria-label="刷新数据"
          >
            <span
              className={isRefreshing ? "refresh-button__icon is-spinning" : "refresh-button__icon"}
              aria-hidden="true"
            >
              ↻
            </span>
            {isRefreshing ? "刷新中" : "刷新"}
          </button>
        </div>
      </header>

      {error ? <ErrorBanner message={errorMessage(error)} onRetry={retry} /> : null}

      <CurrentConditions
        station={station}
        measurement={latest.data ?? null}
        loading={latest.isLoading}
      />

      <div className="analysis-bar">
        <div className="analysis-bar__info">
          <h2>分析区间</h2>
          <p aria-live="polite">
            {rangeLabel} · {rows.length} 条记录 ·{" "}
            {updatedAt
              ? `更新于 ${formatTime(updatedAt)}`
              : latest.isLoading
                ? "读取中"
                : "等待数据"}
          </p>
        </div>
        <div className="analysis-bar__actions">
          <span className="live-pill">
            <span className="status-dot" aria-hidden="true" />
            60 秒自动刷新
          </span>
          <RangeTabs
            options={RANGE_OPTIONS.map(({ key, label }) => ({ key, label }))}
            value={range}
            onChange={(key) => {
              if (isRangeKey(key)) {
                setRange(key);
              }
            }}
          />
        </div>
      </div>

      {allPoints.length > 0 ? (
        <SummaryCards
          temperature={temperature}
          humidity={humidity}
          thi={thi}
          temperatureSeries={temperatureSeries}
          humiditySeries={humiditySeries}
          thiSeries={thiSeries}
          samples={rows.length}
          rangeLabel={rangeLabel}
        />
      ) : null}

      <TrendPanel
        station={station}
        points={chartPoints}
        statsPoints={allPoints}
        loading={history.isLoading}
      />

      {allPoints.length > 0 ? <HeatmapPanel points={allPoints} /> : null}

      {allPoints.length > 0 ? (
        <div className="analysis-grid">
          {profile.length >= 2 && insight ? (
            <DiurnalPanel profile={profile} insight={insight} />
          ) : null}
          <ComfortPanel points={chartPoints} />
        </div>
      ) : null}

      {allPoints.length > 0 ? (
        <div className="analysis-grid">
          <BoxPlotPanel points={allPoints} />
          <CorrelationPanel points={allPoints} />
        </div>
      ) : null}

      <div className="analysis-grid">
        <StationMapPanel key={station} station={station} />
        {allPoints.length > 0 ? (
          <DataQualityPanel quality={quality} rangeLabel={rangeLabel} />
        ) : null}
      </div>

      {allPoints.length > 0 ? <EnvironmentPanel snapshot={snapshot} windRose={windBins} /> : null}

      {rows.length > 0 ? (
        <section className="records" aria-labelledby="records-heading">
          <div className="records__head">
            <div>
              <h2 id="records-heading">最近记录</h2>
              <p className="panel__hint">按采集时间倒序，最多展示 20 条。</p>
            </div>
            <span className="panel__tag">原始观测</span>
          </div>
          <MeasurementsTable rows={rows.slice(0, 20)} />
        </section>
      ) : null}

      <footer className="app__footer">
        <span>数据保存在 PostgreSQL，永久保留，不自动清理。</span>
        <span>派生指标与可视化在浏览器内计算；未接入要素不推算。</span>
      </footer>
    </div>
  );
}

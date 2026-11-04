import { ApiError } from "@microclimate/api-client";
import {
  EmptyState,
  ErrorBanner,
  formatTime,
  HistoryChart,
  MeasurementsTable,
  MetricGrid,
  RangeTabs,
  Skeleton,
} from "@microclimate/ui";
import { type FormEvent, useMemo, useState } from "react";

import { useHistory } from "./hooks/useHistory";
import { useLatest } from "./hooks/useLatest";
import { isRangeKey, RANGE_OPTIONS, type RangeKey, toChartPoints } from "./lib/ranges";
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
  const points = useMemo(() => toChartPoints(history.data ?? []), [history.data]);
  const rows = history.data?.slice(0, 20) ?? [];
  const error = latest.error ?? history.error;

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
        <div>
          <p className="app__eyebrow">Campus Microclimate</p>
          <h1>校园微气候监测</h1>
        </div>
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
      </header>

      {error ? <ErrorBanner message={errorMessage(error)} onRetry={retry} /> : null}

      <section className="panel" aria-labelledby="latest-heading">
        <div className="panel__head">
          <h2 id="latest-heading">最新测量</h2>
          <span className="app__status" aria-live="polite">
            {latest.data
              ? `采集于 ${formatTime(latest.data.observed_at)}`
              : latest.isLoading
                ? "加载中"
                : "暂无数据"}
          </span>
        </div>
        {latest.isLoading ? <Skeleton /> : <MetricGrid measurement={latest.data ?? null} />}
      </section>

      <section className="panel" aria-labelledby="history-heading">
        <div className="panel__head">
          <h2 id="history-heading">温湿度趋势</h2>
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
        {history.isLoading ? (
          <Skeleton />
        ) : points.length > 0 ? (
          <HistoryChart points={points} />
        ) : (
          <EmptyState
            title="暂无历史数据"
            description={`站点 ${station} 在当前时间范围内没有记录。`}
          />
        )}
      </section>

      {rows.length > 0 ? <MeasurementsTable rows={rows} /> : null}

      <footer className="app__footer">
        <span>数据保存在 PostgreSQL，永久保留，不自动清理。</span>
        <span>最新值每 60 秒刷新一次。</span>
      </footer>
    </div>
  );
}

import type { AnalysisPoint } from "../../lib/analysis";

import { AnalysisIcon, ChevronLeftIcon, SearchIcon } from "./icons";

interface TopBarProps {
  station: string | null;
  stationCount: number;
  unlocated: number;
  view: "map" | "station" | "analysis";
  layerLabel: string;
  point: AnalysisPoint | null;
  loading: boolean;
  offline: boolean;
  onOpenSearch: () => void;
  onOpenAnalysis: () => void;
  onBackToMap: () => void;
}

export function TopBar({
  station,
  stationCount,
  unlocated,
  view,
  layerLabel,
  point,
  loading,
  offline,
  onOpenSearch,
  onOpenAnalysis,
  onBackToMap,
}: TopBarProps) {
  const status = offline
    ? "连接中断"
    : loading
      ? "读取中"
      : station
        ? point
          ? `${layerLabel} · ${point.fullLabel}`
          : "等待数据"
        : stationCount === 0
          ? "暂无站点数据"
          : `${stationCount} 个站点${unlocated > 0 ? ` · ${unlocated} 个未上报坐标` : ""}`;

  return (
    <header className="topbar">
      <div className="topbar__left">
        {view !== "map" ? (
          <button
            type="button"
            className="topbar__back"
            onClick={onBackToMap}
            aria-label="返回地图"
          >
            <ChevronLeftIcon size={18} />
          </button>
        ) : null}
        <div className="topbar__brand">
          <span className="topbar__mark" aria-hidden="true">
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
            <p className="topbar__eyebrow">Campus Microclimate</p>
            <h1>微气候观测地图</h1>
          </div>
        </div>
      </div>

      <button type="button" className="station-switch" onClick={onOpenSearch}>
        <SearchIcon size={16} />
        <span>{station ?? "全部站点"}</span>
        <span className="station-switch__hint">
          {station ? "切换站点" : `${stationCount} 个已定位`}
        </span>
      </button>

      <div className="topbar__status" aria-live="polite">
        <span className={offline ? "status-dot is-offline" : "status-dot"} aria-hidden="true" />
        <span>{status}</span>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          onClick={onOpenAnalysis}
          disabled={!station}
          aria-label="打开分析工作台"
          title={station ? "分析工作台" : "选择站点后查看分析"}
        >
          <AnalysisIcon size={18} />
        </button>
      </div>
    </header>
  );
}

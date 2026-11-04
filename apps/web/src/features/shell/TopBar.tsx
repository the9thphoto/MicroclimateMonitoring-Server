import type { AnalysisPoint } from "../../lib/analysis";

import { AnalysisIcon, ChevronLeftIcon, MapPinIcon, SearchIcon } from "./icons";

interface TopBarProps {
  station: string;
  view: "map" | "station" | "analysis";
  layerLabel: string;
  point: AnalysisPoint | null;
  loading: boolean;
  offline: boolean;
  onOpenSearch: () => void;
  onOpenLocation: () => void;
  onOpenAnalysis: () => void;
  onBackToMap: () => void;
}

export function TopBar({
  station,
  view,
  layerLabel,
  point,
  loading,
  offline,
  onOpenSearch,
  onOpenLocation,
  onOpenAnalysis,
  onBackToMap,
}: TopBarProps) {
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
        <span>{station}</span>
        <span className="station-switch__hint">切换站点</span>
      </button>

      <div className="topbar__status" aria-live="polite">
        <span className={offline ? "status-dot is-offline" : "status-dot"} aria-hidden="true" />
        <span>
          {offline
            ? "连接中断"
            : loading
              ? "读取中"
              : point
                ? `${layerLabel} · ${point.fullLabel}`
                : "等待数据"}
        </span>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          onClick={onOpenLocation}
          aria-label="设置站点位置"
          title="设置站点位置"
        >
          <MapPinIcon size={18} />
        </button>
        <button
          type="button"
          onClick={onOpenAnalysis}
          aria-label="打开分析工作台"
          title="分析工作台"
        >
          <AnalysisIcon size={18} />
        </button>
      </div>
    </header>
  );
}

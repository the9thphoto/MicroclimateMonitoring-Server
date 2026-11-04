import type { LayerDefinition } from "../../lib/layers";
import type { NetworkStation } from "../../lib/network";
import { MapLegend } from "../layers/MapLegend";

interface NetworkDockProps {
  stations: NetworkStation[];
  unlocated: number;
  layer: LayerDefinition;
  lastUpdated: string | null;
  loading: boolean;
  onRefresh: () => void;
}

function updatedLabel(value: string | null): string {
  if (!value) {
    return "暂无观测";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NetworkDock({
  stations,
  unlocated,
  layer,
  lastUpdated,
  loading,
  onRefresh,
}: NetworkDockProps) {
  return (
    <section className="network-dock" aria-label="全网观测概览">
      <div className="network-dock__head">
        <span className="source-badge">全网</span>
        <strong>{stations.length} 个站点</strong>
        <span className={unlocated > 0 ? "network-dock__warning" : "network-dock__muted"}>
          {unlocated > 0 ? `${unlocated} 个站点未上报坐标` : "全部站点已定位"}
        </span>
        <span className="network-dock__muted">最后更新 {updatedLabel(lastUpdated)}</span>
        <button type="button" className="network-dock__refresh" onClick={onRefresh}>
          {loading ? "刷新中…" : "刷新"}
        </button>
      </div>
      <div className="network-dock__body">
        <MapLegend layer={layer} />
        <p className="network-dock__hint">点击站点查看时间序列</p>
      </div>
    </section>
  );
}

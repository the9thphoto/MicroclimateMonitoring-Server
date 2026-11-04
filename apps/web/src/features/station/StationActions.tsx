import { AnalysisIcon, LayersIcon, MapPinIcon } from "../shell/icons";

interface StationActionsProps {
  onOpenAnalysis: () => void;
  onOpenData: () => void;
  onOpenLocation: () => void;
}

export function StationActions({
  onOpenAnalysis,
  onOpenData,
  onOpenLocation,
}: StationActionsProps) {
  return (
    <div className="station-actions">
      <button type="button" className="button button--primary" onClick={onOpenAnalysis}>
        <AnalysisIcon size={16} />
        研究视图
      </button>
      <button type="button" className="button button--ghost" onClick={onOpenData}>
        <LayersIcon size={16} />
        原始数据
      </button>
      <button type="button" className="button button--ghost" onClick={onOpenLocation}>
        <MapPinIcon size={16} />
        设置位置
      </button>
    </div>
  );
}

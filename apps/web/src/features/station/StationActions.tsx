import { AnalysisIcon, LayersIcon } from "../shell/icons";

interface StationActionsProps {
  onOpenAnalysis: () => void;
  onOpenData: () => void;
}

export function StationActions({ onOpenAnalysis, onOpenData }: StationActionsProps) {
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
    </div>
  );
}

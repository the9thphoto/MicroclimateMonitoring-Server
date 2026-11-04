import type { AnalysisPoint, DataQuality } from "../../lib/analysis";
import type { LayerDefinition } from "../../lib/layers";
import type { StationLocation } from "../../lib/location";
import { CloseIcon } from "../shell/icons";
import { StationActions } from "./StationActions";
import { StationContent } from "./StationContent";

interface StationPanelProps {
  station: string;
  point: AnalysisPoint | null;
  values: AnalysisPoint[];
  layer: LayerDefinition;
  quality: DataQuality;
  location: StationLocation | null;
  onClose: () => void;
  onOpenAnalysis: () => void;
  onOpenData: () => void;
}

export function StationPanel({
  station,
  point,
  values,
  layer,
  quality,
  location,
  onClose,
  onOpenAnalysis,
  onOpenData,
}: StationPanelProps) {
  return (
    <aside className="station-panel" aria-label={`${station} 站点详情`}>
      <header className="station-panel__head">
        <div>
          <p className="eyebrow">STATION</p>
          <h2>{station}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="关闭站点详情，返回总览地图"
        >
          <CloseIcon size={18} />
        </button>
      </header>
      <div className="station-panel__scroll">
        <StationContent
          station={station}
          point={point}
          values={values}
          layer={layer}
          quality={quality}
          location={location}
        />
      </div>
      <div className="station-panel__actions">
        <StationActions onOpenAnalysis={onOpenAnalysis} onOpenData={onOpenData} />
      </div>
    </aside>
  );
}

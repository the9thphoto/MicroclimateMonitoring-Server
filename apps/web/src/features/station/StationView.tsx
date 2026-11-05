import type { AnalysisPoint, DataQuality } from "../../lib/analysis";
import type { LayerDefinition, LayerId } from "../../lib/layers";
import { LAYERS } from "../../lib/layers";
import type { StationLocation } from "../../lib/location";
import { LayerSelect } from "../layers/LayerSelect";
import { ChevronLeftIcon } from "../shell/icons";
import { StationActions } from "./StationActions";
import { StationContent } from "./StationContent";

interface StationViewProps {
  station: string;
  point: AnalysisPoint | null;
  values: AnalysisPoint[];
  layer: LayerDefinition;
  quality: DataQuality;
  location: StationLocation | null;
  availability: Record<LayerId, boolean>;
  onSelectLayer: (id: LayerId) => void;
  onBack: () => void;
  onOpenAnalysis: () => void;
  onOpenData: () => void;
}

export function StationView({
  station,
  point,
  values,
  layer,
  quality,
  location,
  availability,
  onSelectLayer,
  onBack,
  onOpenAnalysis,
  onOpenData,
}: StationViewProps) {
  return (
    <main className="station-page">
      <header className="station-page__head">
        <button type="button" className="button button--ghost" onClick={onBack}>
          <ChevronLeftIcon size={17} />
          返回地图
        </button>
        <div>
          <p className="eyebrow">STATION</p>
          <h2>{station}</h2>
        </div>
        <LayerSelect
          layers={LAYERS.filter((item) => availability[item.id])}
          value={layer.id}
          onChange={onSelectLayer}
        />
      </header>

      <StationContent
        station={station}
        point={point}
        values={values}
        layer={layer}
        quality={quality}
        location={location}
      />
      <div className="station-page__actions">
        <StationActions onOpenAnalysis={onOpenAnalysis} onOpenData={onOpenData} />
      </div>
    </main>
  );
}

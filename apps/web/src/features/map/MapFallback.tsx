import type { LayerDefinition } from "../../lib/layers";
import { formatLayerValue, layerColor } from "../../lib/layers";
import type { StationLocation } from "../../lib/location";

export interface MapStationMarker {
  stationId: string;
  location: StationLocation;
  value: number | null;
  direction: number | null;
  selected: boolean;
}

interface MapFallbackProps {
  markers: MapStationMarker[];
  activeLayer: LayerDefinition;
  onSelectStation: (stationId: string) => void;
}

export function MapFallback({ markers, activeLayer, onSelectStation }: MapFallbackProps) {
  return (
    <section className="map-fallback" aria-label="地图降级视图">
      <div className="map-fallback__grid" aria-hidden="true" />
      <div className="map-fallback__content">
        <strong>地图渲染不可用</strong>
        <p>当前浏览器无法启用 WebGL，站点数据仍可访问。</p>
        {markers.length === 0 ? (
          <p className="map-fallback__empty">尚未配置站点坐标。</p>
        ) : (
          <ul>
            {markers.map((marker) => (
              <li key={marker.stationId}>
                <button
                  type="button"
                  onClick={() => onSelectStation(marker.stationId)}
                  aria-label={`站点 ${marker.stationId}，${activeLayer.label} ${formatLayerValue(activeLayer, marker.value)}`}
                >
                  <i
                    style={{ background: layerColor(activeLayer, marker.value) }}
                    aria-hidden="true"
                  />
                  <span>{marker.stationId}</span>
                  <strong>{formatLayerValue(activeLayer, marker.value)}</strong>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

import type { LayerDefinition } from "../../lib/layers";

interface MapLegendProps {
  layer: LayerDefinition;
}

export function MapLegend({ layer }: MapLegendProps) {
  return (
    <section
      className="map-legend"
      aria-label={`${layer.label}图例，${layer.domain[0]} 到 ${layer.domain[1]} ${layer.unit}`}
    >
      <div className="map-legend__head">
        <span>{layer.label}</span>
        <span>{layer.unit || "指数"}</span>
      </div>
      <span
        className="map-legend__bar"
        style={{ background: `linear-gradient(90deg, ${layer.stops.join(", ")})` }}
        aria-hidden="true"
      />
      <div className="map-legend__ticks">
        <span>{layer.domain[0]}</span>
        <span>{layer.domain[1]}</span>
      </div>
      <span className="map-legend__source">站点观测 · 非空间插值</span>
    </section>
  );
}

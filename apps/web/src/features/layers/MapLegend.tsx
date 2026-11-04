import { type LayerDefinition, TEMPERATURE_TICKS } from "../../lib/layers";

interface MapLegendProps {
  layer: LayerDefinition;
  domain?: [number, number];
  ticks?: number[];
  source?: string;
}

export function MapLegend({ layer, domain = layer.domain, ticks, source }: MapLegendProps) {
  const tickValues =
    ticks ?? (layer.id === "temperature" ? TEMPERATURE_TICKS : [domain[0], domain[1]]);
  return (
    <section
      className="map-legend"
      aria-label={`${layer.label}图例，${domain[0]} 到 ${domain[1]} ${layer.unit}`}
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
        {tickValues.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <span className="map-legend__source">{source ?? "站点观测 · 非空间插值"}</span>
    </section>
  );
}

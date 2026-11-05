import { type LayerDefinition, layerTicks } from "../../lib/layers";

interface MapLegendProps {
  layer: LayerDefinition;
  domain?: [number, number];
  ticks?: number[];
  source?: string;
}

export function MapLegend({ layer, domain = layer.domain, ticks, source }: MapLegendProps) {
  const tickValues = ticks ?? layerTicks(layer, domain);
  return (
    <section
      className="map-legend"
      aria-label={`${layer.label}图例，${domain[0]} 到 ${domain[1]} ${layer.unit}`}
    >
      <div className="map-legend__head">
        <span>{layer.label}</span>
        <span>{layer.unit || "指数"}</span>
      </div>
      {layer.categories ? (
        <div className="map-legend__categories">
          {layer.categories.map((category) => (
            <span key={category.label}>
              <i style={{ background: category.color }} aria-hidden="true" />
              {category.label}
            </span>
          ))}
        </div>
      ) : (
        <>
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
        </>
      )}
      <span className="map-legend__source">{source ?? "站点观测 · 非空间插值"}</span>
    </section>
  );
}

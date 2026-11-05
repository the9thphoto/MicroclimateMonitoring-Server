import type { LayerDefinition } from "./layers";

export function computeFieldDomain(
  values: Array<number | null | undefined>,
  layer: LayerDefinition,
): [number, number] {
  if (layer.scale === "categorical" || !layer.adaptiveDomain) {
    return layer.domain;
  }
  const finite = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (finite.length < 2) {
    return layer.domain;
  }
  let low = Math.min(...finite);
  let high = Math.max(...finite);
  const minSpan = layer.minSpan ?? 1;
  if (high - low < minSpan) {
    const middle = (low + high) / 2;
    low = middle - minSpan / 2;
    high = middle + minSpan / 2;
  }
  const padding = (high - low) * 0.05;
  low -= padding;
  high += padding;
  const step = layer.tickStep ?? 1;
  low = Math.floor(low / step) * step;
  high = Math.ceil(high / step) * step;
  low = Math.max(layer.domain[0], low);
  high = Math.min(layer.domain[1], high);
  if (high - low < minSpan) {
    return layer.domain;
  }
  return [low, high];
}

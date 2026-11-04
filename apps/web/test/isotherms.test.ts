import { describe, expect, it } from "vitest";
import type { ScalarField } from "../src/lib/field";
import { buildIsotherms } from "../src/lib/isotherms";

function field(): ScalarField {
  return {
    id: "temperature",
    bounds: { west: 118.6, east: 118.7, south: 32, north: 32.1 },
    width: 3,
    height: 3,
    values: new Float32Array([20, 21, 22, 21, 22, 23, 22, 23, 24]),
    alpha: new Float32Array(9).fill(1),
    mean: 22,
    hull: [],
    stationCount: 9,
  };
}

describe("isotherms", () => {
  it("builds line segments for integer levels inside the field", () => {
    const contours = buildIsotherms(field());
    expect(contours.features.length).toBeGreaterThan(0);
    expect(contours.features.every((feature) => feature.properties.level >= 20)).toBe(true);
    expect(contours.features[0]?.geometry.type).toBe("LineString");
  });

  it("returns no lines for a flat field", () => {
    const flat = field();
    flat.values.fill(20);
    expect(buildIsotherms(flat).features).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";

import { computeFieldDomain } from "../src/lib/domain";
import { layerById } from "../src/lib/layers";

describe("field domains", () => {
  it("stretches narrow temperature data instead of using the hard domain", () => {
    const domain = computeFieldDomain([20, 24, 27], layerById("temperature"));
    expect(domain[0]).toBeGreaterThan(-20);
    expect(domain[1]).toBeLessThan(45);
    expect(domain[1] - domain[0]).toBeGreaterThanOrEqual(4);
  });

  it("falls back when there are fewer than two values", () => {
    expect(computeFieldDomain([20], layerById("temperature"))).toEqual([-20, 45]);
  });

  it("keeps AQI on the fixed EPA domain", () => {
    expect(computeFieldDomain([20, 80], layerById("aqi"))).toEqual([0, 300]);
  });
});

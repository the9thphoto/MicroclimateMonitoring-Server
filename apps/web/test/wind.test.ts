import { describe, expect, it } from "vitest";

import {
  formatWindDirection,
  formatWindSpeed,
  normalizeDirection,
  windBarbParts,
  windBarbSvg,
} from "../src/lib/wind";

describe("wind helpers", () => {
  it("formats 16-point directions and normalization", () => {
    expect(normalizeDirection(-45)).toBe(315);
    expect(normalizeDirection(360)).toBe(0);
    expect(formatWindDirection(225)).toContain("SW");
    expect(formatWindDirection(225)).toContain("来向");
  });

  it("formats m/s and knots", () => {
    expect(formatWindSpeed(5)).toBe("5.0 m/s（9.7 kt）");
  });

  it("decomposes barbs by 5/10/50 kt", () => {
    expect(windBarbParts(0.5)?.calm).toBe(true);
    expect(windBarbParts(2.57)?.halfBarbs).toBe(1);
    expect(windBarbParts(5.14)?.fullBarbs).toBe(1);
    expect(windBarbParts(25.72)?.pennants).toBe(1);
  });

  it("rotates the barb toward the source direction", () => {
    const svg = windBarbSvg(180, 5);
    expect(svg).toContain("rotate(180");
  });
});

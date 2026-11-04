import { describe, expect, it } from "vitest";

import { forecastProvider, hasUsableCapabilities } from "../src/lib/forecast";

describe("forecast seam", () => {
  it("keeps forecast integration disabled until a provider exists", () => {
    expect(forecastProvider).toBeNull();
  });

  it("requires usable capabilities before showing forecast layers", () => {
    expect(hasUsableCapabilities(null)).toBe(false);
    expect(
      hasUsableCapabilities({
        provider: "test",
        model: "test",
        generatedAt: "2026-11-04T00:00:00Z",
        horizonHours: 0,
        stepMinutes: 60,
        bbox: [0, 0, 1, 1],
        parameters: ["temperature"],
      }),
    ).toBe(false);
    expect(
      hasUsableCapabilities({
        provider: "test",
        model: "test",
        generatedAt: "2026-11-04T00:00:00Z",
        horizonHours: 24,
        stepMinutes: 60,
        bbox: [0, 0, 1, 1],
        parameters: ["temperature"],
      }),
    ).toBe(true);
  });
});

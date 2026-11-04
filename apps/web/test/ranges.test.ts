import { describe, expect, it } from "vitest";

import { isRangeKey, rangeWindow } from "../src/lib/ranges";

describe("rangeWindow", () => {
  it("subtracts the selected duration from the end", () => {
    const now = new Date("2026-11-04T08:00:00Z");
    const { start, end } = rangeWindow("1h", now);
    expect(end.toISOString()).toBe("2026-11-04T08:00:00.000Z");
    expect(start.toISOString()).toBe("2026-11-04T07:00:00.000Z");
  });
});

describe("isRangeKey", () => {
  it("accepts known ranges and rejects unknown values", () => {
    expect(isRangeKey("24h")).toBe(true);
    expect(isRangeKey("30d")).toBe(false);
    expect(isRangeKey(null)).toBe(false);
  });
});

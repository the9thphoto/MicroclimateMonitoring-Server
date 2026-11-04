import { describe, expect, it } from "vitest";

import { formatClock, formatNumber, formatTime } from "../src/format";

describe("formatNumber", () => {
  it("formats finite numbers", () => {
    expect(formatNumber(21.64, 1)).toBe("21.6");
    expect(formatNumber(0, 0)).toBe("0");
  });

  it("renders a dash for missing or non-finite values", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
  });
});

describe("time formatting", () => {
  it("keeps unparsable input visible", () => {
    expect(formatTime("not-a-time")).toBe("not-a-time");
    expect(formatClock("not-a-time")).toBe("not-a-time");
  });
});

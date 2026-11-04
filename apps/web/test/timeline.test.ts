import { describe, expect, it } from "vitest";

import { canPlay, clampIndex, followLatest, isAtEnd, nextIndex } from "../src/lib/timeline";

describe("timeline helpers", () => {
  it("clamps indexes into the available frames", () => {
    expect(clampIndex(-3, 5)).toBe(0);
    expect(clampIndex(9, 5)).toBe(4);
    expect(clampIndex(2, 0)).toBe(-1);
  });

  it("advances and stops at the last frame", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(2);
    expect(isAtEnd(2, 3)).toBe(true);
    expect(isAtEnd(1, 3)).toBe(false);
    expect(canPlay(2)).toBe(true);
    expect(canPlay(1)).toBe(false);
  });

  it("follows the latest frame unless the user is replaying history", () => {
    expect(followLatest(-1, 0, 10)).toBe(9);
    expect(followLatest(9, 10, 11)).toBe(10);
    expect(followLatest(3, 10, 11)).toBe(3);
    expect(followLatest(8, 10, 5)).toBe(4);
    expect(followLatest(0, 3, 0)).toBe(-1);
  });
});

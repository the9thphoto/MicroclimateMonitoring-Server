import { describe, expect, it } from "vitest";

import { stationFromSearch, stationSearch } from "../src/lib/station";

describe("station URL state", () => {
  it("reads a station and falls back to the default", () => {
    expect(stationFromSearch("?station=station-02")).toBe("station-02");
    expect(stationFromSearch("?station=%20%20")).toBe("station-01");
    expect(stationFromSearch("")).toBe("station-01");
  });

  it("keeps unrelated query parameters", () => {
    const search = stationSearch("?range=7d", "station-02");
    const params = new URLSearchParams(search);
    expect(params.get("station")).toBe("station-02");
    expect(params.get("range")).toBe("7d");
  });
});

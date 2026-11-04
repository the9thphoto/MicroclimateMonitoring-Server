import { describe, expect, it } from "vitest";

import {
  locationFromSearch,
  locationSearch,
  parseLatitude,
  parseLongitude,
  saveStoredLocation,
  storedLocation,
} from "../src/lib/location";

describe("station location", () => {
  it("parses and validates coordinates", () => {
    expect(parseLatitude("31.2304")).toBe(31.2304);
    expect(parseLatitude("91")).toBeNull();
    expect(parseLatitude("")).toBeNull();
    expect(parseLongitude("-121.4737")).toBe(-121.4737);
    expect(parseLongitude("181")).toBeNull();
  });

  it("reads coordinates from the URL and keeps the station parameter", () => {
    expect(locationFromSearch("?station=station-02&lat=31.2&lon=121.4")).toEqual({
      latitude: 31.2,
      longitude: 121.4,
    });
    const search = locationSearch("?station=station-02", { latitude: 31.2, longitude: 121.4 });
    const params = new URLSearchParams(search);
    expect(params.get("station")).toBe("station-02");
    expect(params.get("lat")).toBe("31.20000");
    expect(params.get("lon")).toBe("121.40000");
    const cleared = new URLSearchParams(locationSearch(search, null));
    expect(cleared.get("station")).toBe("station-02");
    expect(cleared.get("lat")).toBeNull();
  });

  it("persists coordinates per station", () => {
    saveStoredLocation("station-test", { latitude: 30.5, longitude: 120.5 });
    expect(storedLocation("station-test")).toEqual({ latitude: 30.5, longitude: 120.5 });
    saveStoredLocation("station-test", null);
    expect(storedLocation("station-test")).toBeNull();
  });
});

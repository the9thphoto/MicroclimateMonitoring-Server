import { describe, expect, it } from "vitest";

import {
  appStateFromSearch,
  appStateSearch,
  DEFAULT_LAYER,
  DEFAULT_RANGE,
  DEFAULT_VIEW,
  isAnalysisTab,
  isViewMode,
} from "../src/lib/urlState";

describe("app URL state", () => {
  it("reads valid view, station, layer, range and tab values", () => {
    const state = appStateFromSearch(
      "?view=station&station=station-02&layer=windSpeed&range=7d&tab=box",
    );
    expect(state).toEqual({
      view: "station",
      station: "station-02",
      layer: "windSpeed",
      range: "7d",
      tab: "box",
    });
  });

  it("defaults to the network map without a station", () => {
    const state = appStateFromSearch("?view=nope&layer=nope&range=nope&tab=nope");
    expect(state.view).toBe(DEFAULT_VIEW);
    expect(state.station).toBeNull();
    expect(state.layer).toBe(DEFAULT_LAYER);
    expect(state.range).toBe(DEFAULT_RANGE);
    expect(state.tab).toBe("heatmap");
    expect(isViewMode("analysis")).toBe(true);
    expect(isAnalysisTab("windrose")).toBe(true);
  });

  it("drops the station in map view and keeps unrelated parameters", () => {
    const search = appStateSearch("?station=station-02&lat=31.2&lon=121.4&foo=bar", {
      view: "map",
      station: null,
    });
    const params = new URLSearchParams(search);
    expect(params.get("station")).toBeNull();
    expect(params.get("view")).toBe("map");
    expect(params.get("foo")).toBe("bar");
    expect(params.get("lat")).toBeNull();
    expect(params.get("lon")).toBeNull();
  });
});

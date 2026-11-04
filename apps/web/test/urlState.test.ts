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
      "fallback",
    );
    expect(state).toEqual({
      view: "station",
      station: "station-02",
      layer: "windSpeed",
      range: "7d",
      tab: "box",
    });
  });

  it("falls back for invalid values", () => {
    const state = appStateFromSearch("?view=nope&layer=nope&range=nope&tab=nope", "fallback");
    expect(state.view).toBe(DEFAULT_VIEW);
    expect(state.station).toBe("fallback");
    expect(state.layer).toBe(DEFAULT_LAYER);
    expect(state.range).toBe(DEFAULT_RANGE);
    expect(state.tab).toBe("heatmap");
    expect(isViewMode("analysis")).toBe(true);
    expect(isAnalysisTab("windrose")).toBe(true);
  });

  it("writes state while preserving unrelated parameters and optionally clearing location", () => {
    const search = appStateSearch(
      "?station=station-02&lat=31.2&lon=121.4&foo=bar",
      { view: "analysis", tab: "data" },
      { clearLocation: true },
    );
    const params = new URLSearchParams(search);
    expect(params.get("station")).toBe("station-02");
    expect(params.get("view")).toBe("analysis");
    expect(params.get("tab")).toBe("data");
    expect(params.get("foo")).toBe("bar");
    expect(params.get("lat")).toBeNull();
    expect(params.get("lon")).toBeNull();
  });
});

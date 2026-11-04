import { DEFAULT_STATION_ID } from "@microclimate/contracts";

import { isLayerId, type LayerId } from "./layers";
import { isRangeKey, type RangeKey } from "./ranges";

export type ViewMode = "map" | "station" | "analysis";

export type AnalysisTab = "heatmap" | "box" | "correlation" | "windrose" | "comfort" | "data";

export interface AppUrlState {
  view: ViewMode;
  station: string;
  layer: LayerId;
  range: RangeKey;
  tab: AnalysisTab;
}

export const DEFAULT_VIEW: ViewMode = "map";
export const DEFAULT_LAYER: LayerId = "temperature";
export const DEFAULT_RANGE: RangeKey = "24h";
export const DEFAULT_TAB: AnalysisTab = "heatmap";

const VIEWS: ViewMode[] = ["map", "station", "analysis"];
const TABS: AnalysisTab[] = ["heatmap", "box", "correlation", "windrose", "comfort", "data"];

export function isViewMode(value: string | null | undefined): value is ViewMode {
  return VIEWS.some((view) => view === value);
}

export function isAnalysisTab(value: string | null | undefined): value is AnalysisTab {
  return TABS.some((tab) => tab === value);
}

export function appStateFromSearch(search: string, fallbackStation: string): AppUrlState {
  const params = new URLSearchParams(search);
  const viewValue = params.get("view");
  const tabValue = params.get("tab");
  const layerValue = params.get("layer");
  const rangeValue = params.get("range");
  return {
    view: isViewMode(viewValue) ? viewValue : DEFAULT_VIEW,
    station: params.get("station")?.trim() || fallbackStation,
    layer: isLayerId(layerValue) ? layerValue : DEFAULT_LAYER,
    range: isRangeKey(rangeValue) ? rangeValue : DEFAULT_RANGE,
    tab: isAnalysisTab(tabValue) ? tabValue : DEFAULT_TAB,
  };
}

export function appStateSearch(
  search: string,
  patch: Partial<AppUrlState>,
  options: { clearLocation?: boolean } = {},
): string {
  const params = new URLSearchParams(search);
  const state = appStateFromSearch(search, params.get("station")?.trim() || DEFAULT_STATION_ID);
  const next = { ...state, ...patch };
  params.set("station", next.station);
  params.set("view", next.view);
  params.set("layer", next.layer);
  params.set("range", next.range);
  params.set("tab", next.tab);
  if (options.clearLocation) {
    params.delete("lat");
    params.delete("lon");
  }
  return `?${params.toString()}`;
}

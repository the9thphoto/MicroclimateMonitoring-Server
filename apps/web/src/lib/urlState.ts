import { isLayerId, LAYERS, type LayerId } from "./layers";
import { isRangeKey, type RangeKey } from "./ranges";

export type ViewMode = "map" | "station" | "analysis";

export type AnalysisTab = "heatmap" | "box" | "correlation" | "windrose" | "comfort" | "data";

export interface AppUrlState {
  view: ViewMode;
  station: string | null;
  layer: LayerId;
  overlays: LayerId[];
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

export function appStateFromSearch(search: string): AppUrlState {
  const params = new URLSearchParams(search);
  const viewValue = params.get("view");
  const tabValue = params.get("tab");
  const layerValue = params.get("layer");
  const overlayValues = params.get("overlays");
  const rangeValue = params.get("range");
  const station = params.get("station")?.trim() || null;
  const requestedView = isViewMode(viewValue) ? viewValue : DEFAULT_VIEW;
  const view = requestedView === "map" || !station ? "map" : requestedView;
  const layer = isLayerId(layerValue) ? layerValue : DEFAULT_LAYER;
  const requestedOverlays = overlayValues ? overlayValues.split(",").filter(isLayerId) : [];
  const overlays = LAYERS.map((item) => item.id).filter(
    (id) => id === layer || requestedOverlays.includes(id),
  );
  return {
    view,
    station: view === "map" ? null : station,
    layer,
    overlays: overlays.length > 0 ? overlays : [layer],
    range: isRangeKey(rangeValue) ? rangeValue : DEFAULT_RANGE,
    tab: isAnalysisTab(tabValue) ? tabValue : DEFAULT_TAB,
  };
}

export function appStateSearch(search: string, patch: Partial<AppUrlState>): string {
  const state = appStateFromSearch(search);
  const next = { ...state, ...patch };
  if (next.view === "map") {
    next.station = null;
  }
  const params = new URLSearchParams(search);
  if (next.station) {
    params.set("station", next.station);
  } else {
    params.delete("station");
  }
  params.set("view", next.view);
  params.set("layer", next.layer);
  params.set("overlays", next.overlays.join(","));
  params.set("range", next.range);
  params.set("tab", next.tab);
  params.delete("lat");
  params.delete("lon");
  return `?${params.toString()}`;
}

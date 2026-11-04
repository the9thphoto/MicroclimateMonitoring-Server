import { ApiError } from "@microclimate/api-client";
import { DEFAULT_STATION_ID } from "@microclimate/contracts";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AnalysisView } from "./features/analysis/AnalysisView";
import { LayerRail } from "./features/layers/LayerRail";
import type { MapStationMarker } from "./features/map/MapFallback";
import { TopBar } from "./features/shell/TopBar";
import { LocationDialog } from "./features/station/LocationDialog";
import { StationPanel } from "./features/station/StationPanel";
import { StationPicker } from "./features/station/StationPicker";
import { StationView } from "./features/station/StationView";
import { TimelineDock } from "./features/timeline/TimelineDock";

const MapView = lazy(() =>
  import("./features/map/MapView").then((module) => ({ default: module.MapView })),
);

import { useHistory } from "./hooks/useHistory";
import { useLatest } from "./hooks/useLatest";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useStationDirectory } from "./hooks/useStationDirectory";
import { useTimeline } from "./hooks/useTimeline";
import { dataQuality, toAnalysisPoints } from "./lib/analysis";
import { DEFAULT_LAYER, LAYERS, type LayerId, layerById } from "./lib/layers";
import {
  allStoredLocations,
  defaultLocation,
  formatCoordinates,
  locationFromSearch,
  locationSearch,
  type StationLocation,
  saveStoredLocation,
} from "./lib/location";
import { RANGE_OPTIONS } from "./lib/ranges";
import {
  type AppUrlState,
  appStateFromSearch,
  appStateSearch,
  type ViewMode,
} from "./lib/urlState";

function errorMessage(error: Error | null): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof ApiError) {
    return `服务返回 ${error.status}：${error.detail}`;
  }
  return "无法连接 API，请检查网络或数据库。";
}

export function App() {
  const [state, setState] = useState<AppUrlState>(() =>
    appStateFromSearch(window.location.search, DEFAULT_STATION_ID),
  );
  const [locations, setLocations] = useState<Record<string, StationLocation>>(() => {
    const stored = allStoredLocations();
    const urlLocation = locationFromSearch(window.location.search);
    const station = appStateFromSearch(window.location.search, DEFAULT_STATION_ID).station;
    if (urlLocation) {
      stored[station] = urlLocation;
    }
    const fallback = defaultLocation();
    if (!stored[station] && fallback) {
      stored[station] = fallback;
    }
    return stored;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 700px)");

  const latest = useLatest(state.station);
  const history = useHistory(state.station, state.range);
  const directory = useStationDirectory();

  const rangeOption =
    RANGE_OPTIONS.find((option) => option.key === state.range) ?? RANGE_OPTIONS[2]!;
  const rangeMs = rangeOption.milliseconds;
  const rows = useMemo(() => history.data ?? [], [history.data]);
  const allPoints = useMemo(
    () => toAnalysisPoints(rows, rangeMs, Math.max(rows.length, 1)),
    [rows, rangeMs],
  );
  const chartPoints = useMemo(() => toAnalysisPoints(rows, rangeMs), [rows, rangeMs]);
  const latestPoint = useMemo(
    () => (latest.data ? (toAnalysisPoints([latest.data], rangeMs, 1)[0] ?? null) : null),
    [latest.data, rangeMs],
  );
  const activeLayer = layerById(state.layer);
  const timeline = useTimeline(chartPoints, state.station, state.range);
  const selected = timeline.selected ?? latestPoint;
  const quality = useMemo(() => dataQuality(rows, rangeMs), [rows, rangeMs]);

  const availability = useMemo(() => {
    const source = allPoints.length > 0 ? allPoints : latestPoint ? [latestPoint] : [];
    return Object.fromEntries(
      LAYERS.map((layer) => [layer.id, source.length > 0 && layer.available(source)]),
    ) as Record<LayerId, boolean>;
  }, [allPoints, latestPoint]);

  const updateState = useCallback(
    (patch: Partial<AppUrlState>, options: { clearLocation?: boolean } = {}) => {
      setState((previous) => ({ ...previous, ...patch }));
      const search = appStateSearch(window.location.search, patch, options);
      window.history.replaceState(null, "", `${window.location.pathname}${search}`);
    },
    [],
  );

  const selectStation = useCallback(
    (stationId: string) => {
      const nextView: ViewMode = state.view === "analysis" ? "analysis" : "station";
      updateState({ station: stationId, view: nextView }, { clearLocation: true });
      setPickerOpen(false);
      setLocationOpen(false);
    },
    [state.view, updateState],
  );

  const saveLocation = useCallback(
    (location: StationLocation) => {
      setLocations((previous) => ({ ...previous, [state.station]: location }));
      saveStoredLocation(state.station, location);
      setLocationOpen(false);
      setPickMode(false);
      setToast(`已保存 ${state.station} 的位置：${formatCoordinates(location)}`);
      const search = locationSearch(window.location.search, location);
      window.history.replaceState(null, "", `${window.location.pathname}${search}`);
    },
    [state.station],
  );

  const clearLocation = useCallback(() => {
    setLocations((previous) => {
      const next = { ...previous };
      delete next[state.station];
      return next;
    });
    saveStoredLocation(state.station, null);
    setLocationOpen(false);
    setToast(`已清除 ${state.station} 的位置`);
    const search = locationSearch(window.location.search, null);
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }, [state.station]);

  const selectLayer = useCallback(
    (layer: LayerId) => {
      updateState({ layer });
    },
    [updateState],
  );

  const openAnalysis = useCallback(() => updateState({ view: "analysis" }), [updateState]);
  const openMap = useCallback(() => updateState({ view: "map" }), [updateState]);
  const openData = useCallback(() => updateState({ view: "analysis", tab: "data" }), [updateState]);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const openLocationDialog = useCallback(() => setLocationOpen(true), []);
  const closeLocationDialog = useCallback(() => setLocationOpen(false), []);
  const pickOnMap = useCallback(() => {
    setLocationOpen(false);
    setPickMode(true);
  }, []);
  const forecastNotice = useCallback(() => setToast("预报服务尚未接入，暂不显示预报场。"), []);

  const error = latest.error ?? history.error ?? directory.error;
  const message = errorMessage(error);
  const offline = Boolean(error);
  const focus = locations[state.station] ?? null;

  const markers = useMemo(() => {
    const result: MapStationMarker[] = [];
    const seen = new Set<string>();
    const snapshots = directory.data ?? [];

    for (const snapshot of snapshots) {
      const location = locations[snapshot.stationId];
      if (!location) {
        continue;
      }
      const isSelected = snapshot.stationId === state.station;
      const point = isSelected
        ? selected
        : (toAnalysisPoints([snapshot.latest], rangeMs, 1)[0] ?? null);
      result.push({
        stationId: snapshot.stationId,
        location,
        value: point ? activeLayer.valueOf(point) : null,
        direction: point?.windDirection ?? null,
        selected: isSelected,
      });
      seen.add(snapshot.stationId);
    }

    if (!seen.has(state.station) && focus) {
      result.push({
        stationId: state.station,
        location: focus,
        value: selected ? activeLayer.valueOf(selected) : null,
        direction: selected?.windDirection ?? null,
        selected: true,
      });
    }
    return result;
  }, [directory.data, locations, state.station, selected, activeLayer, focus, rangeMs]);

  const stationOptions = useMemo(() => {
    const options = directory.data ?? [];
    if (!latest.data || options.some((item) => item.stationId === state.station)) {
      return options;
    }
    return [...options, { stationId: state.station, latest: latest.data }];
  }, [directory.data, latest.data, state.station]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!pickMode) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPickMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickMode]);

  useEffect(() => {
    if (!offline) {
      return;
    }
    setPickMode(false);
  }, [offline]);

  useEffect(() => {
    if (!allPoints.length) {
      return;
    }
    if (state.layer !== DEFAULT_LAYER && !layerById(state.layer).available(allPoints)) {
      updateState({ layer: DEFAULT_LAYER });
    }
  }, [allPoints, state.layer, updateState]);

  useEffect(() => {
    const onPopState = () => {
      const next = appStateFromSearch(window.location.search, DEFAULT_STATION_ID);
      setState(next);
      const urlLocation = locationFromSearch(window.location.search);
      if (urlLocation) {
        setLocations((previous) => ({ ...previous, [next.station]: urlLocation }));
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const retry = () => {
    void latest.refetch();
    void history.refetch();
    void directory.refetch();
  };

  const handleTimelineIndex = (index: number) => {
    timeline.stop();
    timeline.setIndex(index);
  };

  const handleRange = (range: AppUrlState["range"]) => {
    timeline.stop();
    updateState({ range });
  };

  const stationHeader = (
    <TopBar
      station={state.station}
      view={state.view}
      layerLabel={activeLayer.label}
      point={selected}
      loading={latest.isLoading || history.isLoading}
      offline={offline}
      onOpenSearch={openPicker}
      onOpenLocation={openLocationDialog}
      onOpenAnalysis={openAnalysis}
      onBackToMap={openMap}
    />
  );

  if (state.view === "analysis") {
    return (
      <div className="app-shell app-shell--analysis">
        <AnalysisView
          station={state.station}
          range={state.range}
          tab={state.tab}
          rows={rows}
          points={allPoints}
          chartPoints={chartPoints}
          quality={quality}
          onBack={openMap}
          onPickStation={openPicker}
          onRangeChange={(range) => updateState({ range })}
          onTabChange={(tab) => updateState({ tab })}
        />
        <StationPicker
          open={pickerOpen}
          selected={state.station}
          stations={stationOptions}
          locations={locations}
          onSelect={selectStation}
          onClose={closePicker}
        />
        {message ? (
          <div className="app-error" role="alert">
            <span>{message}</span>
            <button type="button" onClick={retry}>
              重试
            </button>
          </div>
        ) : null}
        {toast ? (
          <div className="toast" role="status">
            {toast}
          </div>
        ) : null}
      </div>
    );
  }

  const mobileStation = isMobile && state.view === "station";

  return (
    <div className="app-shell">
      {stationHeader}

      {mobileStation ? (
        <StationView
          station={state.station}
          point={selected}
          values={chartPoints}
          layer={activeLayer}
          quality={quality}
          location={focus}
          availability={availability}
          onSelectLayer={selectLayer}
          onForecast={forecastNotice}
          onBack={openMap}
          onOpenAnalysis={openAnalysis}
          onOpenData={openData}
          onOpenLocation={openLocationDialog}
        />
      ) : (
        <>
          <div className={state.view === "station" ? "workspace-main has-panel" : "workspace-main"}>
            {state.view === "station" ? (
              <StationPanel
                station={state.station}
                point={selected}
                values={chartPoints}
                layer={activeLayer}
                quality={quality}
                location={focus}
                onClose={openMap}
                onOpenAnalysis={openAnalysis}
                onOpenData={openData}
                onOpenLocation={openLocationDialog}
              />
            ) : null}
            <Suspense fallback={<div className="map-loading">正在加载地图…</div>}>
              <MapView
                markers={markers}
                activeLayer={activeLayer}
                focus={focus}
                mode={state.view === "station" ? "station" : "overview"}
                pickMode={pickMode}
                onSelectStation={selectStation}
                onPickLocation={saveLocation}
                onOpenLocation={openLocationDialog}
              />
            </Suspense>
            <LayerRail
              active={state.layer}
              availability={availability}
              onSelect={selectLayer}
              onForecast={forecastNotice}
            />
          </div>
          <TimelineDock
            points={chartPoints}
            selectedIndex={timeline.index}
            selected={selected}
            layer={activeLayer}
            range={state.range}
            playing={timeline.playing}
            speed={timeline.speed}
            canPlay={timeline.canPlay}
            onRangeChange={handleRange}
            onSelectIndex={handleTimelineIndex}
            onToggle={timeline.toggle}
            onSpeedChange={timeline.setSpeed}
            onToLatest={timeline.toLatest}
            compact={isMobile}
          />
        </>
      )}

      {message ? (
        <div className="app-error" role="alert">
          <span>{message}</span>
          <button type="button" onClick={retry}>
            重试
          </button>
        </div>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}

      <StationPicker
        open={pickerOpen}
        selected={state.station}
        stations={stationOptions}
        locations={locations}
        onSelect={selectStation}
        onClose={closePicker}
      />

      {locationOpen ? (
        <LocationDialog
          station={state.station}
          initial={focus}
          onSave={saveLocation}
          onClear={clearLocation}
          onPickOnMap={pickOnMap}
          onClose={closeLocationDialog}
        />
      ) : null}
    </div>
  );
}

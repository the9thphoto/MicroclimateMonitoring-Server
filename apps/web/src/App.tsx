import { ApiError } from "@microclimate/api-client";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AnalysisView } from "./features/analysis/AnalysisView";
import { LayerRail } from "./features/layers/LayerRail";
import type { MapStationMarker } from "./features/map/MapFallback";
import { TopBar } from "./features/shell/TopBar";
import { StationPanel } from "./features/station/StationPanel";
import { StationPicker } from "./features/station/StationPicker";
import { StationView } from "./features/station/StationView";
import { TimelineDock } from "./features/timeline/TimelineDock";

const MapView = lazy(() =>
  import("./features/map/MapView").then((module) => ({ default: module.MapView })),
);

import type { MapField } from "./features/map/MapView";

import { useHistory } from "./hooks/useHistory";
import { useLatest } from "./hooks/useLatest";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useNetworkFrames } from "./hooks/useNetworkFrames";
import { useStationDirectory } from "./hooks/useStationDirectory";
import { useTimeline } from "./hooks/useTimeline";
import { dataQuality, toAnalysisPoints } from "./lib/analysis";
import { buildScalarField } from "./lib/field";
import { LAYERS, type LayerId, layerById } from "./lib/layers";
import {
  buildNetworkStations,
  networkAvailability,
  unlocatedCount,
  visibleNetworkStations,
} from "./lib/network";
import { RANGE_OPTIONS } from "./lib/ranges";
import { type AppUrlState, appStateFromSearch, appStateSearch } from "./lib/urlState";

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
  const [state, setState] = useState<AppUrlState>(() => appStateFromSearch(window.location.search));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [overlayIds, setOverlayIds] = useState<LayerId[]>(["temperature"]);
  const isMobile = useMediaQuery("(max-width: 700px)");

  const latest = useLatest(state.station);
  const history = useHistory(state.station, state.range);
  const directory = useStationDirectory();
  const networkFrames = useNetworkFrames(state.range);

  const rangeOption =
    RANGE_OPTIONS.find((option) => option.key === state.range) ?? RANGE_OPTIONS[2]!;
  const rangeMs = rangeOption.milliseconds;
  const networkStations = useMemo(
    () => buildNetworkStations(directory.data ?? [], rangeMs),
    [directory.data, rangeMs],
  );
  const visibleStations = useMemo(() => visibleNetworkStations(networkStations), [networkStations]);
  const selectedStation = useMemo(
    () => visibleStations.find((station) => station.stationId === state.station) ?? null,
    [visibleStations, state.station],
  );
  const hasPanel = state.view === "station" && Boolean(selectedStation);
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
  const networkPoints = useMemo(
    () => networkFrames.data?.map((frame) => frame.average) ?? [],
    [networkFrames.data],
  );
  const networkTimeline = useTimeline(networkPoints, "network", state.range);
  const selectedNetworkFrame =
    networkFrames.data?.[networkTimeline.index] ??
    networkFrames.data?.[networkFrames.data.length - 1] ??
    null;
  const displayStations = hasPanel
    ? visibleStations
    : selectedNetworkFrame?.stations.length
      ? selectedNetworkFrame.stations
      : visibleStations;
  const activeLayer = layerById(state.layer);
  const timeline = useTimeline(chartPoints, state.station ?? "", state.range);
  const selected = timeline.selected ?? latestPoint;
  const quality = useMemo(() => dataQuality(rows, rangeMs), [rows, rangeMs]);
  const availability = useMemo(() => networkAvailability(visibleStations), [visibleStations]);
  const unlocated = useMemo(() => unlocatedCount(networkStations), [networkStations]);
  const pointsForAvailability = displayStations.map((station) => station.point);
  const overlayOptions = useMemo(
    () =>
      LAYERS.map((layer) => ({
        id: layer.id,
        label: layer.label,
        shortLabel: layer.shortLabel,
        stops: layer.stops,
        domain: layer.domain,
        unit: layer.unit,
        available: layer.available(pointsForAvailability),
        active: overlayIds.includes(layer.id),
      })),
    [pointsForAvailability, overlayIds],
  );
  const fields = useMemo<MapField[]>(() => {
    if (hasPanel) {
      return [];
    }
    const result: MapField[] = [];
    for (const id of overlayIds) {
      const layer = layerById(id);
      const field = buildScalarField(displayStations, id, layer.valueOf);
      if (field) {
        result.push({
          id,
          layer,
          field,
          opacity: id === state.layer ? 0.55 : 0.28,
        });
      }
    }
    return result.sort((left, right) =>
      left.id === state.layer ? 1 : right.id === state.layer ? -1 : 0,
    );
  }, [overlayIds, displayStations, hasPanel, state.layer]);
  const activeField = fields.find((item) => item.id === state.layer);
  const fieldSource = activeField
    ? `IDW ${activeField.layer.label}场 · ${activeField.field.stationCount} 站 · 远场均值 ${activeField.field.mean.toFixed(1)}${activeField.layer.unit} · 虚线内有效${activeField.id === "temperature" ? " · 等温线" : ""}`
    : undefined;
  const displayDomain = activeLayer.domain;
  const toggleOverlay = useCallback((id: LayerId) => {
    setOverlayIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  }, []);

  const updateState = useCallback((patch: Partial<AppUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...patch };
      if (next.view === "map") {
        next.station = null;
      }
      return next;
    });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${appStateSearch(window.location.search, patch)}`,
    );
  }, []);

  const selectStation = useCallback(
    (stationId: string) => {
      updateState({ station: stationId, view: "station" });
      setPickerOpen(false);
    },
    [updateState],
  );

  const selectAllStations = useCallback(() => {
    updateState({ view: "map", station: null });
    setPickerOpen(false);
  }, [updateState]);

  const selectLayer = useCallback(
    (layer: LayerId) => {
      updateState({ layer });
    },
    [updateState],
  );

  const openAnalysis = useCallback(() => {
    if (!state.station) {
      return;
    }
    updateState({ view: "analysis" });
  }, [state.station, updateState]);
  const openMap = useCallback(() => {
    updateState({ view: "map", station: null });
  }, [updateState]);
  const openData = useCallback(() => {
    if (!state.station) {
      return;
    }
    updateState({ view: "analysis", tab: "data" });
  }, [state.station, updateState]);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const forecastNotice = useCallback(() => setToast("预报服务尚未接入，暂不显示预报场。"), []);

  const error = latest.error ?? history.error ?? directory.error ?? networkFrames.error;
  const message = errorMessage(error);
  const offline = Boolean(error);
  const focus = selectedStation?.location ?? null;

  const markers = useMemo<MapStationMarker[]>(() => {
    return displayStations.map((station) => {
      const point = station.stationId === state.station && selected ? selected : station.point;
      return {
        stationId: station.stationId,
        location: station.location!,
        value: activeLayer.valueOf(point),
        windSpeed: point.windSpeed ?? null,
        direction: point.windDirection ?? null,
        selected: station.stationId === state.station,
      };
    });
  }, [displayStations, state.station, selected, activeLayer]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onPopState = () => {
      setState(appStateFromSearch(window.location.search));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (availability[state.layer]) {
      return;
    }
    const fallback = LAYERS.find((layer) => availability[layer.id])?.id;
    if (fallback) {
      updateState({ layer: fallback });
    }
  }, [availability, state.layer, updateState]);

  useEffect(() => {
    if (
      state.view !== "station" ||
      !state.station ||
      !directory.isSuccess ||
      selectedStation ||
      directory.isFetching
    ) {
      return;
    }
    updateState({ view: "map", station: null });
  }, [
    state.view,
    state.station,
    directory.isSuccess,
    directory.isFetching,
    selectedStation,
    updateState,
  ]);

  const retry = () => {
    void latest.refetch();
    void history.refetch();
    void directory.refetch();
    void networkFrames.refetch();
  };

  const handleTimelineIndex = (index: number) => {
    timeline.stop();
    timeline.setIndex(index);
  };

  const handleRange = (range: AppUrlState["range"]) => {
    timeline.stop();
    networkTimeline.stop();
    updateState({ range });
  };

  const handleNetworkIndex = (index: number) => {
    networkTimeline.stop();
    networkTimeline.setIndex(index);
  };

  const stationHeader = (
    <TopBar
      station={state.station}
      stationCount={visibleStations.length}
      unlocated={unlocated}
      view={state.view}
      layerLabel={state.station ? activeLayer.label : `${activeLayer.label} · 全网平均`}
      point={state.station ? selected : networkTimeline.selected}
      loading={
        directory.isLoading || latest.isLoading || history.isLoading || networkFrames.isLoading
      }
      offline={offline}
      onOpenSearch={openPicker}
      onOpenAnalysis={openAnalysis}
      onBackToMap={openMap}
    />
  );

  if (state.view === "analysis" && state.station) {
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
          stations={visibleStations}
          onSelect={(stationId) => (stationId ? selectStation(stationId) : selectAllStations())}
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

  const mobileStation = isMobile && hasPanel;

  return (
    <div className="app-shell">
      {stationHeader}

      {mobileStation && selectedStation ? (
        <StationView
          station={selectedStation.stationId}
          point={selected}
          values={chartPoints}
          layer={activeLayer}
          quality={quality}
          location={selectedStation.location}
          availability={availability}
          onSelectLayer={selectLayer}
          onForecast={forecastNotice}
          onBack={openMap}
          onOpenAnalysis={openAnalysis}
          onOpenData={openData}
        />
      ) : (
        <>
          <div className={hasPanel ? "workspace-main has-panel" : "workspace-main"}>
            {hasPanel && selectedStation ? (
              <StationPanel
                station={selectedStation.stationId}
                point={selected}
                values={chartPoints}
                layer={activeLayer}
                quality={quality}
                location={selectedStation.location}
                onClose={openMap}
                onOpenAnalysis={openAnalysis}
                onOpenData={openData}
              />
            ) : null}
            <Suspense fallback={<div className="map-loading">正在加载地图…</div>}>
              <MapView
                markers={markers}
                activeLayer={activeLayer}
                focus={focus}
                mode={hasPanel ? "station" : "overview"}
                domain={displayDomain}
                fields={fields}
                windVisible={
                  !hasPanel && (overlayIds.includes("windSpeed") || state.layer === "windSpeed")
                }
                onSelectStation={selectStation}
              />
            </Suspense>
            <LayerRail
              active={state.layer}
              availability={availability}
              onSelect={selectLayer}
              onForecast={forecastNotice}
            />
          </div>
          {hasPanel && selectedStation ? (
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
              domain={displayDomain}
              compact={isMobile}
            />
          ) : (
            <TimelineDock
              points={networkPoints}
              selectedIndex={networkTimeline.index}
              selected={networkTimeline.selected}
              layer={activeLayer}
              range={state.range}
              playing={networkTimeline.playing}
              speed={networkTimeline.speed}
              canPlay={networkTimeline.canPlay}
              onRangeChange={handleRange}
              onSelectIndex={handleNetworkIndex}
              onToggle={networkTimeline.toggle}
              onSpeedChange={networkTimeline.setSpeed}
              onToLatest={networkTimeline.toLatest}
              domain={displayDomain}
              source={fieldSource}
              overlays={overlayOptions}
              onToggleOverlay={toggleOverlay}
              compact={isMobile}
            />
          )}
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
        stations={visibleStations}
        onSelect={(stationId) => (stationId ? selectStation(stationId) : selectAllStations())}
        onClose={closePicker}
      />
    </div>
  );
}

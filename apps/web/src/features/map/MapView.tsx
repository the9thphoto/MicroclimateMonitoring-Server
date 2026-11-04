import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef, useState } from "react";

import type { LayerDefinition } from "../../lib/layers";
import { formatLayerValue, layerColor } from "../../lib/layers";
import { CAMPUS_LOCATION, type StationLocation } from "../../lib/location";
import { FitIcon, LocateIcon, MapPinIcon } from "../shell/icons";
import { MapFallback, type MapStationMarker } from "./MapFallback";
import { createFallbackStyle, MAP_STYLE_URL } from "./mapStyle";

interface MapViewProps {
  markers: MapStationMarker[];
  activeLayer: LayerDefinition;
  focus: StationLocation | null;
  mode: "overview" | "station" | "forecast";
  onSelectStation: (stationId: string) => void;
}

interface MarkerHandle {
  marker: maplibregl.Marker;
  element: HTMLButtonElement;
}

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const INITIAL_CENTER: [number, number] = [CAMPUS_LOCATION.longitude, CAMPUS_LOCATION.latitude];
const INITIAL_ZOOM = 14;

function updateMarker(handle: MarkerHandle, data: MapStationMarker, activeLayer: LayerDefinition) {
  const { element } = handle;
  const color = layerColor(activeLayer, data.value);
  element.style.setProperty("--marker-color", color);
  element.classList.toggle("is-selected", data.selected);
  element.dataset.station = data.stationId;
  element.setAttribute(
    "aria-label",
    `站点 ${data.stationId}，${activeLayer.label} ${formatLayerValue(activeLayer, data.value)}，点击查看详情`,
  );

  const name = element.querySelector<HTMLElement>(".station-marker__name");
  const value = element.querySelector<HTMLElement>(".station-marker__value");
  if (name) {
    name.textContent = data.stationId;
  }
  if (value) {
    value.textContent = formatLayerValue(activeLayer, data.value);
  }

  const wind = element.querySelector<HTMLElement>(".station-marker__wind");
  const showWind = activeLayer.id === "windSpeed" && data.direction !== null;
  if (wind) {
    wind.hidden = !showWind;
    if (showWind) {
      wind.style.transform = `rotate(${(data.direction ?? 0) + 180}deg)`;
    }
  }
}

function createMarkerElement(stationId: string, onSelect: (id: string) => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "station-marker";
  element.dataset.station = stationId;
  element.innerHTML = `
    <span class="station-marker__pulse" aria-hidden="true"></span>
    <span class="station-marker__pill">
      <span class="station-marker__name"></span>
      <span class="station-marker__value"></span>
      <span class="station-marker__wind" aria-hidden="true">↑</span>
    </span>
  `;
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect(stationId);
  });
  return element;
}

export function MapView({ markers, activeLayer, focus, mode, onSelectStation }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerHandles = useRef<Map<string, MarkerHandle>>(new Map());
  const selectCallbackRef = useRef(onSelectStation);
  const initialFocusRef = useRef(focus);
  const hadFocusRef = useRef(Boolean(focus));
  const initialFitRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tileIssue, setTileIssue] = useState(false);
  const [styleFallback, setStyleFallback] = useState(false);

  selectCallbackRef.current = onSelectStation;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let map: maplibregl.Map;
    try {
      const initialFocus = initialFocusRef.current;
      map = new maplibregl.Map({
        container,
        style: MAP_STYLE_URL,
        center: initialFocus ? [initialFocus.longitude, initialFocus.latitude] : INITIAL_CENTER,
        zoom: initialFocus ? 14 : INITIAL_ZOOM,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      setFailed(true);
      return;
    }

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.getCanvas().setAttribute("aria-label", "气象站点地图");
    map.getCanvas().tabIndex = 0;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    const onError = () => setTileIssue(true);
    map.on("error", onError);
    map.on("load", () => setReady(true));
    const styleTimer = window.setTimeout(() => {
      if (!map.isStyleLoaded()) {
        map.setStyle(createFallbackStyle());
        setStyleFallback(true);
      }
    }, 8000);
    map.once("style.load", () => window.clearTimeout(styleTimer));
    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(styleTimer);
      map.off("error", onError);
      map.remove();
      mapRef.current = null;
      markerHandles.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) {
      return;
    }
    if (map.getLayer("labels")) {
      map.setPaintProperty("labels", "raster-opacity", mode === "forecast" ? 0.22 : 0.88);
    }
  }, [mode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) {
      return;
    }
    hadFocusRef.current = true;
    map.flyTo({
      center: [focus.longitude, focus.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 750,
      essential: true,
    });
  }, [focus, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || focus || markers.length === 0) {
      return;
    }
    if (!hadFocusRef.current && initialFitRef.current) {
      return;
    }
    hadFocusRef.current = false;
    initialFitRef.current = true;
    const bounds = new maplibregl.LngLatBounds();
    for (const marker of markers) {
      bounds.extend([marker.location.longitude, marker.location.latitude]);
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 650 });
    }
  }, [focus, ready, markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || failed) {
      return;
    }
    const seen = new Set<string>();
    const showNames = markers.length <= 8;
    for (const data of markers) {
      const { latitude, longitude } = data.location;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        continue;
      }
      seen.add(data.stationId);
      let handle = markerHandles.current.get(data.stationId);
      if (!handle) {
        const element = createMarkerElement(data.stationId, (id) => selectCallbackRef.current(id));
        const marker = new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat([longitude, latitude])
          .addTo(map);
        handle = { marker, element };
        markerHandles.current.set(data.stationId, handle);
      }
      updateMarker(handle, data, activeLayer);
      handle.element.classList.toggle("show-name", showNames);
      handle.marker.setLngLat([longitude, latitude]);
      handle.element.style.zIndex = data.selected ? "2" : "1";
    }

    for (const [stationId, handle] of markerHandles.current) {
      if (!seen.has(stationId)) {
        handle.marker.remove();
        markerHandles.current.delete(stationId);
      }
    }
  }, [markers, activeLayer, ready, failed]);

  const fitAll = () => {
    const map = mapRef.current;
    if (!map || markers.length === 0) {
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    for (const marker of markers) {
      bounds.extend([marker.location.longitude, marker.location.latitude]);
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 12, duration: 650 });
    }
  };

  const focusSelected = () => {
    const map = mapRef.current;
    if (!map || !focus) {
      return;
    }
    map.flyTo({
      center: [focus.longitude, focus.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 650,
    });
  };

  return (
    <div className={["map-view", styleFallback ? "is-fallback" : ""].filter(Boolean).join(" ")}>
      <div ref={containerRef} className="map-view__canvas" />
      {failed ? (
        <MapFallback
          markers={markers}
          activeLayer={activeLayer}
          onSelectStation={onSelectStation}
        />
      ) : null}

      {!failed && markers.length === 0 ? (
        <div className="map-empty" role="status">
          <span className="map-empty__icon" aria-hidden="true">
            <MapPinIcon size={22} />
          </span>
          <div>
            <strong>暂无站点上报坐标</strong>
            <p>设备上报经纬度后，站点会自动出现在地图上。</p>
          </div>
        </div>
      ) : null}

      {tileIssue && !failed ? (
        <div className="map-badge" role="status">
          底图离线 · 站点标记仍可用
        </div>
      ) : null}

      <div className="map-controls">
        <button type="button" onClick={fitAll} aria-label="适配全部站点" title="适配全部站点">
          <FitIcon size={18} />
        </button>
        <button
          type="button"
          onClick={focusSelected}
          aria-label="定位到选中站点"
          title="定位到选中站点"
          disabled={!focus}
        >
          <LocateIcon size={18} />
        </button>
      </div>
    </div>
  );
}

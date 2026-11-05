import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef, useState } from "react";

import { hexToRgb } from "../../lib/colors";
import type { ScalarField } from "../../lib/field";
import { buildIsotherms } from "../../lib/isotherms";
import type { LayerDefinition, LayerId } from "../../lib/layers";
import { formatLayerValue, layerColor } from "../../lib/layers";
import { CAMPUS_LOCATION, type StationLocation } from "../../lib/location";
import { formatWindDirection, formatWindSpeed, windBarbSvg } from "../../lib/wind";
import { FitIcon, LocateIcon, MapPinIcon } from "../shell/icons";
import { MapFallback, type MapStationMarker } from "./MapFallback";
import { createFallbackStyle, MAP_STYLE_URL } from "./mapStyle";
import { WindBarbKey } from "./WindBarbKey";

export interface MapField {
  id: LayerId;
  layer: LayerDefinition;
  field: ScalarField;
  domain: [number, number];
  opacity: number;
}

interface MapViewProps {
  markers: MapStationMarker[];
  activeLayer: LayerDefinition;
  focus: StationLocation | null;
  mode: "overview" | "station" | "forecast";
  domain: [number, number];
  fields: MapField[];
  windVisible: boolean;
  onSelectStation: (stationId: string) => void;
}

interface MarkerHandle {
  marker: maplibregl.Marker;
  element: HTMLButtonElement;
}

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const INITIAL_CENTER: [number, number] = [CAMPUS_LOCATION.longitude, CAMPUS_LOCATION.latitude];
const INITIAL_ZOOM = 14;

function updateMarker(
  handle: MarkerHandle,
  data: MapStationMarker,
  activeLayer: LayerDefinition,
  domain: [number, number],
) {
  const { element } = handle;
  const color = layerColor(activeLayer, data.value, domain);
  element.style.setProperty("--marker-color", color);
  element.classList.toggle("is-selected", data.selected);
  element.dataset.station = data.stationId;
  const summary = `${activeLayer.label} ${formatLayerValue(activeLayer, data.value)}`;
  element.setAttribute("aria-label", `站点 ${data.stationId}，${summary}，点击查看详情`);
  element.title = `${data.stationId}：${summary}`;

  const name = element.querySelector<HTMLElement>(".station-marker__name");
  const value = element.querySelector<HTMLElement>(".station-marker__value");
  if (name) {
    name.textContent = data.stationId;
  }
  if (value) {
    value.textContent = formatLayerValue(activeLayer, data.value);
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
    </span>
  `;
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect(stationId);
  });
  return element;
}

export function MapView({
  markers,
  activeLayer,
  focus,
  mode,
  domain,
  fields,
  windVisible,
  onSelectStation,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerHandles = useRef<Map<string, MarkerHandle>>(new Map());
  const windHandles = useRef<Map<string, maplibregl.Marker>>(new Map());
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
    const dense = markers.length > 8;
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
      updateMarker(handle, data, activeLayer, domain);
      handle.element.classList.toggle("show-name", showNames);
      handle.element.classList.toggle("is-dense", dense && !data.selected);
      handle.marker.setLngLat([longitude, latitude]);
      handle.element.style.zIndex = data.selected ? "2" : "1";
    }

    for (const [stationId, handle] of markerHandles.current) {
      if (!seen.has(stationId)) {
        handle.marker.remove();
        markerHandles.current.delete(stationId);
      }
    }
  }, [markers, activeLayer, domain, ready, failed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || failed) {
      return;
    }
    const visible = new Set<string>();
    for (const data of markers) {
      if (!windVisible || data.direction === null || data.windSpeed === null) {
        continue;
      }
      let marker = windHandles.current.get(data.stationId);
      if (!marker) {
        const element = document.createElement("div");
        element.className = "wind-barb";
        marker = new maplibregl.Marker({
          element,
          anchor: "center",
          offset: [0, -28],
        })
          .setLngLat([data.location.longitude, data.location.latitude])
          .addTo(map);
        windHandles.current.set(data.stationId, marker);
      }
      marker.setLngLat([data.location.longitude, data.location.latitude]);
      const element = marker.getElement();
      element.innerHTML = windBarbSvg(data.direction, data.windSpeed);
      const directionText = formatWindDirection(data.direction) ?? "—";
      const speedText = formatWindSpeed(data.windSpeed) ?? "—";
      element.title = `${data.stationId}：${directionText}，${speedText}`;
      element.setAttribute("aria-label", `${data.stationId} 风羽：${directionText}，${speedText}`);
      visible.add(data.stationId);
    }
    for (const [stationId, marker] of windHandles.current) {
      if (!visible.has(stationId)) {
        marker.remove();
        windHandles.current.delete(stationId);
      }
    }
  }, [markers, windVisible, ready, failed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || failed || (styleFallback && !map.isStyleLoaded())) {
      return;
    }
    const remove = () => {
      const style = map.getStyle();
      if (!style) {
        return;
      }
      for (const layer of style.layers ?? []) {
        if (layer.id.startsWith("field-") && map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      }
      for (const sourceId of Object.keys(style.sources ?? {})) {
        if (sourceId.startsWith("field-") && map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    };
    remove();
    if (fields.length === 0) {
      return remove;
    }

    const firstSymbol = map.getStyle()?.layers?.find((layer) => layer.type === "symbol")?.id;
    for (const item of fields) {
      const { field, layer, opacity, id } = item;
      const canvas = document.createElement("canvas");
      canvas.width = field.width;
      canvas.height = field.height;
      const context = canvas.getContext("2d");
      if (!context) {
        continue;
      }
      const image = context.createImageData(field.width, field.height);
      for (let index = 0; index < field.values.length; index += 1) {
        const value = field.values[index];
        if (value === undefined || !Number.isFinite(value)) {
          continue;
        }
        const [red, green, blue] = hexToRgb(layerColor(layer, value, item.domain));
        const offset = index * 4;
        image.data[offset] = red;
        image.data[offset + 1] = green;
        image.data[offset + 2] = blue;
        image.data[offset + 3] = Math.round((field.alpha[index] ?? 0) * 235);
      }
      context.putImageData(image, 0, 0);
      const { west, east, south, north } = field.bounds;
      const sourceId = `field-${id}`;
      const layerId = `field-${id}`;
      map.addSource(sourceId, {
        type: "image",
        url: canvas.toDataURL("image/png"),
        coordinates: [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      });
      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": opacity,
            "raster-resampling": "linear",
            "raster-fade-duration": 0,
          },
        },
        firstSymbol,
      );
    }

    const temperatureField = fields.find((item) => item.id === "temperature");
    if (temperatureField) {
      const contours = buildIsotherms(temperatureField.field);
      if (contours.features.length > 0) {
        map.addSource("field-isolines", { type: "geojson", data: contours });
        map.addLayer(
          {
            id: "field-isolines",
            type: "line",
            source: "field-isolines",
            paint: {
              "line-color": "#f1f7f5",
              "line-width": 0.9,
              "line-opacity": 0.62,
            },
          },
          firstSymbol,
        );
        if (map.getStyle()?.glyphs) {
          const labelFeatures = contours.features.map((feature) => {
            const coordinates = feature.geometry.coordinates;
            const middle = coordinates[Math.floor(coordinates.length / 2)] ?? coordinates[0];
            return {
              type: "Feature" as const,
              properties: { level: feature.properties.level },
              geometry: { type: "Point" as const, coordinates: middle },
            };
          });
          map.addSource("field-isoline-labels", {
            type: "geojson",
            data: { type: "FeatureCollection", features: labelFeatures },
          });
          map.addLayer(
            {
              id: "field-isoline-labels",
              type: "symbol",
              source: "field-isoline-labels",
              layout: {
                "text-field": ["to-string", ["get", "level"]],
                "text-font": ["Noto Sans Regular"],
                "text-size": 9,
                "text-allow-overlap": false,
                "text-ignore-placement": false,
              },
              paint: {
                "text-color": "#e9f4f2",
                "text-halo-color": "#071318",
                "text-halo-width": 1.1,
              },
            },
            firstSymbol,
          );
        }
      }
    }

    const boundary = fields[0]?.field.hull.map((point) => [point.longitude, point.latitude]) ?? [];
    if (boundary.length >= 3) {
      boundary.push(boundary[0]!);
      map.addSource("field-boundary", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: boundary },
        },
      });
      map.addLayer(
        {
          id: "field-boundary",
          type: "line",
          source: "field-boundary",
          paint: {
            "line-color": "#d8e8ed",
            "line-width": 1.2,
            "line-opacity": 0.72,
            "line-dasharray": [2, 2],
          },
        },
        firstSymbol,
      );
    }
    return remove;
  }, [fields, ready, failed, styleFallback]);

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
    <div
      className={[
        "map-view",
        fields.length > 0 ? "has-field" : "",
        styleFallback ? "is-fallback" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-field-layers={fields.map((field) => field.id).join(",")}
    >
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

      {windVisible ? <WindBarbKey /> : null}

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

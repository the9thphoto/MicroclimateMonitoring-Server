import type { StyleSpecification } from "maplibre-gl";

const DEFAULT_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const FALLBACK_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function envString(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const MAP_STYLE_URL = envString("VITE_MAP_STYLE_URL", DEFAULT_STYLE_URL);

/** Keyless raster fallback used when the hosted vector style cannot load. */
export function createFallbackStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [FALLBACK_TILES],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#071318" } },
      { id: "osm", type: "raster", source: "osm", paint: { "raster-opacity": 0.9 } },
    ],
  };
}

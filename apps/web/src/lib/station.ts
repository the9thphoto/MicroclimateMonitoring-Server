import { DEFAULT_STATION_ID } from "@microclimate/contracts";

export function stationFromSearch(search: string, fallback = DEFAULT_STATION_ID): string {
  const station = new URLSearchParams(search).get("station")?.trim();
  return station || fallback;
}

export function stationSearch(search: string, station: string): string {
  const params = new URLSearchParams(search);
  params.set("station", station);
  return `?${params.toString()}`;
}

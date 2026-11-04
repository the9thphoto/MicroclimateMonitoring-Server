import type { Measurement } from "@microclimate/api-client";

import { measurementLocation, type StationLocation } from "./location";

export interface StationSnapshot {
  stationId: string;
  latest: Measurement;
  location: StationLocation | null;
}

/**
 * The API returns newest first; keep the first row per station so the map
 * shows the most recent observation without one query per station.
 */
export function groupLatestByStation(rows: Measurement[]): StationSnapshot[] {
  const latest = new Map<string, Measurement>();
  for (const row of rows) {
    if (!latest.has(row.station_id)) {
      latest.set(row.station_id, row);
    }
  }
  return [...latest.entries()]
    .map(([stationId, measurement]) => ({
      stationId,
      latest: measurement,
      location: measurementLocation(measurement),
    }))
    .sort((left, right) => left.stationId.localeCompare(right.stationId));
}

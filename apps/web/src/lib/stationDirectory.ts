import type { Measurement } from "@microclimate/api-client";

export interface StationSnapshot {
  stationId: string;
  latest: Measurement;
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
    .map(([stationId, measurement]) => ({ stationId, latest: measurement }))
    .sort((left, right) => left.stationId.localeCompare(right.stationId));
}

import type { Measurement } from "@microclimate/api-client";

import { type AnalysisPoint, toAnalysisPoints } from "./analysis";
import { LAYERS, type LayerId } from "./layers";
import type { StationLocation } from "./location";
import type { StationSnapshot } from "./stationDirectory";

export interface NetworkStation extends StationSnapshot {
  point: AnalysisPoint;
}

export function buildNetworkStations(
  snapshots: StationSnapshot[],
  rangeMs: number,
): NetworkStation[] {
  const result: NetworkStation[] = [];
  for (const snapshot of snapshots) {
    const point = toAnalysisPoints([snapshot.latest], rangeMs, 1)[0];
    if (point) {
      result.push({ ...snapshot, point });
    }
  }
  return result;
}

export function visibleNetworkStations(stations: NetworkStation[]): NetworkStation[] {
  return stations.filter((station) => station.location !== null);
}

export function networkAvailability(stations: NetworkStation[]): Record<LayerId, boolean> {
  const points = stations.map((station) => station.point);
  return Object.fromEntries(LAYERS.map((layer) => [layer.id, layer.available(points)])) as Record<
    LayerId,
    boolean
  >;
}

export function unlocatedCount(stations: NetworkStation[]): number {
  return stations.filter((station) => station.location === null).length;
}

export function latestNetworkTime(stations: NetworkStation[]): string | null {
  let latest: string | null = null;
  for (const station of stations) {
    const value = station.latest.observed_at;
    if (latest === null || value > latest) {
      latest = value;
    }
  }
  return latest;
}

export function stationLocation(station: NetworkStation): StationLocation | null {
  return station.location;
}

export function latestMeasurement(station: NetworkStation): Measurement {
  return station.latest;
}

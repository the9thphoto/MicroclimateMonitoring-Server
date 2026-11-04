import type { NetworkStation } from "./network";

export interface FieldBounds {
  west: number;
  east: number;
  south: number;
  north: number;
}

export interface TemperatureField {
  bounds: FieldBounds;
  width: number;
  height: number;
  values: Float32Array;
  alpha: Float32Array;
  domain: [number, number];
  stationCount: number;
  maxDistance: number;
}

interface FieldPoint {
  latitude: number;
  longitude: number;
  value: number;
}

interface HullPoint {
  latitude: number;
  longitude: number;
}

const GRID_SIZE = 144;
const MIN_DOMAIN_SPAN = 2;

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cross(origin: HullPoint, a: HullPoint, b: HullPoint): number {
  return (
    (a.longitude - origin.longitude) * (b.latitude - origin.latitude) -
    (a.latitude - origin.latitude) * (b.longitude - origin.longitude)
  );
}

export function convexHull(points: HullPoint[]): HullPoint[] {
  if (points.length < 3) {
    return [];
  }
  const sorted = [...points].sort(
    (left, right) => left.longitude - right.longitude || left.latitude - right.latitude,
  );
  const lower: HullPoint[] = [];
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper: HullPoint[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]!;
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0
    ) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function pointInHull(latitude: number, longitude: number, hull: HullPoint[]): boolean {
  if (hull.length < 3) {
    return false;
  }
  let inside = false;
  for (let index = 0, previous = hull.length - 1; index < hull.length; previous = index++) {
    const a = hull[index]!;
    const b = hull[previous]!;
    const intersects =
      a.latitude > latitude !== b.latitude > latitude &&
      longitude <
        ((b.longitude - a.longitude) * (latitude - a.latitude)) / (b.latitude - a.latitude) +
          a.longitude;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(
  latitude: number,
  longitude: number,
  start: HullPoint,
  end: HullPoint,
): number {
  const dx = end.longitude - start.longitude;
  const dy = end.latitude - start.latitude;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((longitude - start.longitude) * dx + (latitude - start.latitude) * dy) / lengthSquared,
          ),
        );
  const nearestLongitude = start.longitude + t * dx;
  const nearestLatitude = start.latitude + t * dy;
  return Math.hypot(longitude - nearestLongitude, latitude - nearestLatitude);
}

function hullEdgeDistance(latitude: number, longitude: number, hull: HullPoint[]): number {
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < hull.length; index += 1) {
    const start = hull[index]!;
    const end = hull[(index + 1) % hull.length]!;
    distance = Math.min(distance, distanceToSegment(latitude, longitude, start, end));
  }
  return distance;
}

function pointsFromStations(stations: NetworkStation[]): FieldPoint[] {
  const points: FieldPoint[] = [];
  for (const station of stations) {
    if (!station.location) {
      continue;
    }
    const value = finiteOrNull(station.point.temperature);
    if (value === null) {
      continue;
    }
    points.push({
      latitude: station.location.latitude,
      longitude: station.location.longitude,
      value,
    });
  }
  return points;
}

export function idwValue(
  points: FieldPoint[],
  latitude: number,
  longitude: number,
  maxDistance: number,
): number | null {
  let weighted = 0;
  let totalWeight = 0;
  const maxDistanceSquared = maxDistance * maxDistance;
  for (const point of points) {
    const dLat = latitude - point.latitude;
    const dLon = longitude - point.longitude;
    const distanceSquared = dLat * dLat + dLon * dLon;
    if (distanceSquared > maxDistanceSquared) {
      continue;
    }
    const weight = 1 / (distanceSquared + 1e-10);
    weighted += point.value * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weighted / totalWeight : null;
}

function domainFromValues(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const padded = Math.max(0.5, span * 0.12);
  let low = min - padded;
  let high = max + padded;
  if (high - low < MIN_DOMAIN_SPAN) {
    const center = (low + high) / 2;
    low = center - MIN_DOMAIN_SPAN / 2;
    high = center + MIN_DOMAIN_SPAN / 2;
  }
  return [Number(low.toFixed(1)), Number(high.toFixed(1))];
}

export function buildTemperatureField(stations: NetworkStation[]): TemperatureField | null {
  const points = pointsFromStations(stations);
  if (points.length < 3) {
    return null;
  }

  const hull = convexHull(points);
  if (hull.length < 3) {
    return null;
  }
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const south = Math.min(...latitudes) - 0.01;
  const north = Math.max(...latitudes) + 0.01;
  const west = Math.min(...longitudes) - 0.01;
  const east = Math.max(...longitudes) + 0.01;
  const diagonal = Math.hypot(north - south, east - west);
  const maxDistance = Math.max(0.025, diagonal * 0.2);
  const width = GRID_SIZE;
  const height = GRID_SIZE;
  const values = new Float32Array(width * height);
  const alpha = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const latitude = north - ((y + 0.5) / height) * (north - south);
    for (let x = 0; x < width; x += 1) {
      const longitude = west + ((x + 0.5) / width) * (east - west);
      if (!pointInHull(latitude, longitude, hull)) {
        values[y * width + x] = Number.NaN;
        continue;
      }
      const value = idwValue(points, latitude, longitude, maxDistance);
      if (value === null) {
        values[y * width + x] = Number.NaN;
        continue;
      }
      values[y * width + x] = value;
      const edge = Math.min(x, width - 1 - x, y, height - 1 - y);
      const hullFade = Math.min(1, hullEdgeDistance(latitude, longitude, hull) / 0.006);
      alpha[y * width + x] = Math.min(1, edge / (width * 0.12)) * hullFade;
    }
  }

  return {
    bounds: { west, east, south, north },
    width,
    height,
    values,
    alpha,
    domain: domainFromValues(points.map((point) => point.value)),
    stationCount: points.length,
    maxDistance,
  };
}

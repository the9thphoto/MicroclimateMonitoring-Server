export interface StationLocation {
  latitude: number;
  longitude: number;
}

const STORAGE_PREFIX = "microclimate.location.";

function parseNumber(value: string | null | undefined, min: number, max: number): number | null {
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

export function parseLatitude(value: string | null | undefined): number | null {
  return parseNumber(value, -90, 90);
}

export function parseLongitude(value: string | null | undefined): number | null {
  return parseNumber(value, -180, 180);
}

export function defaultLocation(): StationLocation | null {
  const latitude = parseLatitude(import.meta.env.VITE_STATION_LAT);
  const longitude = parseLongitude(import.meta.env.VITE_STATION_LON);
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

export function locationFromSearch(search: string): StationLocation | null {
  const params = new URLSearchParams(search);
  const latitude = parseLatitude(params.get("lat"));
  const longitude = parseLongitude(params.get("lon"));
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

export function storedLocation(station: string): StationLocation | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${station}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { latitude?: unknown; longitude?: unknown };
    if (typeof parsed.latitude !== "number" || typeof parsed.longitude !== "number") {
      return null;
    }
    if (
      parsed.latitude < -90 ||
      parsed.latitude > 90 ||
      parsed.longitude < -180 ||
      parsed.longitude > 180
    ) {
      return null;
    }
    return { latitude: parsed.latitude, longitude: parsed.longitude };
  } catch {
    return null;
  }
}

export function saveStoredLocation(station: string, location: StationLocation | null): void {
  try {
    const key = `${STORAGE_PREFIX}${station}`;
    if (location === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(location));
    }
  } catch {
    // Storage can be unavailable in private mode; the URL remains authoritative.
  }
}

export function allStoredLocations(): Record<string, StationLocation> {
  const result: Record<string, StationLocation> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(STORAGE_PREFIX)) {
        continue;
      }
      const station = key.slice(STORAGE_PREFIX.length);
      const location = storedLocation(station);
      if (location) {
        result[station] = location;
      }
    }
  } catch {
    return result;
  }
  return result;
}

export function formatCoordinates(location: StationLocation | null): string {
  if (!location) {
    return "未配置坐标";
  }
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

export function locationSearch(search: string, location: StationLocation | null): string {
  const params = new URLSearchParams(search);
  if (location === null) {
    params.delete("lat");
    params.delete("lon");
  } else {
    params.set("lat", location.latitude.toFixed(5));
    params.set("lon", location.longitude.toFixed(5));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

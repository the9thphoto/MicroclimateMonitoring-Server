import type { Measurement } from "@microclimate/api-client";

export interface StationLocation {
  latitude: number;
  longitude: number;
}

/** Main campus of Nanjing Tech University (Jiangpu campus). */
export const CAMPUS_LOCATION: StationLocation = {
  latitude: 32.0839058,
  longitude: 118.6361144,
};

export function measurementLocation(
  measurement: Pick<Measurement, "latitude" | "longitude">,
): StationLocation | null {
  const { latitude, longitude } = measurement;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

export function formatCoordinates(location: StationLocation | null): string {
  if (!location) {
    return "未上报坐标";
  }
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

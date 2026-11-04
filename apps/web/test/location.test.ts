import { describe, expect, it } from "vitest";

import { CAMPUS_LOCATION, formatCoordinates, measurementLocation } from "../src/lib/location";

describe("station location", () => {
  it("uses device-reported coordinates", () => {
    expect(measurementLocation({ latitude: 32.0839058, longitude: 118.6361144 })).toEqual(
      CAMPUS_LOCATION,
    );
    expect(measurementLocation({ latitude: null, longitude: null })).toBeNull();
    expect(measurementLocation({ latitude: 91, longitude: 118.6 })).toBeNull();
    expect(measurementLocation({ latitude: 32.08, longitude: 181 })).toBeNull();
  });

  it("formats coordinates and the missing state", () => {
    expect(formatCoordinates(CAMPUS_LOCATION)).toBe("32.0839, 118.6361");
    expect(formatCoordinates(null)).toBe("未上报坐标");
  });
});

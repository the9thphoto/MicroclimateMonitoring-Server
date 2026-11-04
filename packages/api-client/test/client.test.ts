import { afterEach, describe, expect, it, vi } from "vitest";
import type { Measurement } from "../src";
import {
  ApiError,
  createApiClient,
  getLatest,
  listAllMeasurements,
  listMeasurements,
} from "../src";

const measurement: Measurement = {
  id: 1,
  station_id: "station-01",
  observed_at: "2026-11-04T00:30:00Z",
  received_at: "2026-11-04T00:30:01Z",
  wind_speed: null,
  wind_direction: null,
  temperature: 21.6,
  humidity: 63,
  co2: null,
  pm25: null,
  pm10: null,
  latitude: 32.0839058,
  longitude: 118.6361144,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listMeasurements", () => {
  it("sends station and paging parameters", async () => {
    const fetchMock = vi.fn(async (_input: Request) => jsonResponse([measurement]));
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient("http://api.test");
    const data = await listMeasurements(client, {
      stationId: "station-01",
      start: "2026-11-03T00:00:00Z",
      end: "2026-11-04T00:00:00Z",
      offset: 100,
      limit: 50,
    });

    expect(data).toHaveLength(1);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/v1/measurements");
    expect(url.searchParams.get("station_id")).toBe("station-01");
    expect(url.searchParams.get("offset")).toBe("100");
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("start")).toBe("2026-11-03T00:00:00Z");
  });

  it("normalizes API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: Request) =>
        jsonResponse({ title: "Unprocessable Entity", status: 422, detail: "bad input" }, 422),
      ),
    );

    const client = createApiClient("http://api.test");
    try {
      await listMeasurements(client);
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(422);
      expect((error as ApiError).detail).toBe("bad input");
    }
  });
});

describe("getLatest", () => {
  it("requests the latest measurement for a station", async () => {
    const fetchMock = vi.fn(async (_input: Request) => jsonResponse(measurement));
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient("http://api.test");
    const data = await getLatest(client, "station-01");
    expect(data.station_id).toBe("station-01");

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/v1/measurements/latest");
    expect(url.searchParams.get("station_id")).toBe("station-01");
  });
});

describe("listAllMeasurements", () => {
  it("walks pages until a short page is returned", async () => {
    const page = Array.from({ length: 1000 }, (_, index) => ({
      ...measurement,
      id: index + 1,
    }));
    const fetchMock = vi
      .fn<(input: Request) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse(page))
      .mockResolvedValueOnce(jsonResponse(page.slice(0, 2)));
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient("http://api.test");
    const data = await listAllMeasurements(client, { stationId: "station-01" });

    expect(data).toHaveLength(1002);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(new URL(secondRequest.url).searchParams.get("offset")).toBe("1000");
  });
});

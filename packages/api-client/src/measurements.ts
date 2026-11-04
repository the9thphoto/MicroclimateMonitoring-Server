import { MAX_PAGE_SIZE } from "@microclimate/contracts";

import { type ApiClient, type Measurement, toApiError } from "./client";

export interface ListMeasurementsOptions {
  stationId?: string;
  start?: string;
  end?: string;
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
}

export async function listMeasurements(
  client: ApiClient,
  options: ListMeasurementsOptions = {},
): Promise<Measurement[]> {
  const { data, error, response } = await client.GET("/api/v1/measurements", {
    params: {
      query: {
        station_id: options.stationId || undefined,
        start: options.start,
        end: options.end,
        offset: options.offset ?? 0,
        limit: options.limit ?? MAX_PAGE_SIZE,
      },
    },
    signal: options.signal,
  });

  if (error !== undefined || data === undefined) {
    throw toApiError(response, error);
  }
  return data ?? [];
}

export async function getLatest(
  client: ApiClient,
  stationId?: string,
  signal?: AbortSignal,
): Promise<Measurement> {
  const { data, error, response } = await client.GET("/api/v1/measurements/latest", {
    params: { query: { station_id: stationId || undefined } },
    signal,
  });

  if (error !== undefined || data === undefined) {
    throw toApiError(response, error);
  }
  return data;
}

export interface ListAllOptions {
  stationId?: string;
  start?: string;
  end?: string;
  maxPages?: number;
  signal?: AbortSignal;
}

/**
 * Fetch history page by page. The API caps a page at 1000 rows, while a
 * seven-day range at one measurement per minute is about eleven pages.
 */
export async function listAllMeasurements(
  client: ApiClient,
  options: ListAllOptions = {},
): Promise<Measurement[]> {
  const maxPages = options.maxPages ?? 12;
  const measurements: Measurement[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await listMeasurements(client, {
      stationId: options.stationId,
      start: options.start,
      end: options.end,
      offset: page * MAX_PAGE_SIZE,
      limit: MAX_PAGE_SIZE,
      signal: options.signal,
    });
    measurements.push(...batch);
    if (batch.length < MAX_PAGE_SIZE) {
      break;
    }
  }
  return measurements;
}

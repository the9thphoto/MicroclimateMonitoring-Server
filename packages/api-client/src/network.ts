import type { components } from "@microclimate/contracts";

import { type ApiClient, toApiError } from "./client";

export type NetworkFrame = components["schemas"]["Frame"];
export type NetworkFrames = components["schemas"]["FramesResponse"];

export interface NetworkFramesOptions {
  start: string;
  end: string;
  step: number;
  signal?: AbortSignal;
}

export async function getNetworkFrames(
  client: ApiClient,
  options: NetworkFramesOptions,
): Promise<NetworkFrames> {
  const { data, error, response } = await client.GET("/api/v1/network/frames", {
    params: {
      query: {
        start: options.start,
        end: options.end,
        step: options.step,
      },
    },
    signal: options.signal,
  });

  if (error !== undefined || data === undefined) {
    throw toApiError(response, error);
  }
  return data;
}

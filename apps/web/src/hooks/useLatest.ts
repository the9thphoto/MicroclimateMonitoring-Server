import { ApiError, getLatest } from "@microclimate/api-client";
import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";

export function useLatest(stationId: string | null) {
  return useQuery({
    queryKey: ["measurements", "latest", stationId],
    enabled: Boolean(stationId),
    queryFn: async ({ signal }) => {
      if (!stationId) {
        return null;
      }
      try {
        return await getLatest(api, stationId, signal);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}

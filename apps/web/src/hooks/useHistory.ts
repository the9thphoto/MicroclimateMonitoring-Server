import { listAllMeasurements } from "@microclimate/api-client";
import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { type RangeKey, rangeWindow } from "../lib/ranges";

export function useHistory(stationId: string | null, range: RangeKey) {
  return useQuery({
    queryKey: ["measurements", "history", stationId, range],
    enabled: Boolean(stationId),
    queryFn: ({ signal }) => {
      const { start, end } = rangeWindow(range);
      return listAllMeasurements(api, {
        stationId: stationId ?? undefined,
        start: start.toISOString(),
        end: end.toISOString(),
        signal,
      });
    },
    staleTime: 60_000,
    retry: 1,
  });
}

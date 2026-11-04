import { getNetworkFrames, type NetworkFrames } from "@microclimate/api-client";
import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { buildNetworkFrames, NETWORK_STEPS, type NetworkFrame } from "../lib/networkFrames";
import { type RangeKey, rangeWindow } from "../lib/ranges";

export function useNetworkFrames(range: RangeKey) {
  return useQuery({
    queryKey: ["measurements", "network-frames", range],
    queryFn: ({ signal }) => {
      const { start, end } = rangeWindow(range);
      return getNetworkFrames(api, {
        start: start.toISOString(),
        end: end.toISOString(),
        step: NETWORK_STEPS[range],
        signal,
      });
    },
    select: (data: NetworkFrames): NetworkFrame[] =>
      buildNetworkFrames(
        data,
        rangeWindow(range).end.getTime() - rangeWindow(range).start.getTime(),
      ),
    staleTime: 30_000,
    retry: 1,
  });
}

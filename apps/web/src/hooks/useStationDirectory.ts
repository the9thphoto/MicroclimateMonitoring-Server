import { listMeasurements } from "@microclimate/api-client";
import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { groupLatestByStation } from "../lib/stationDirectory";

export function useStationDirectory() {
  return useQuery({
    queryKey: ["measurements", "directory"],
    queryFn: ({ signal }) => listMeasurements(api, { limit: 1000, signal }),
    select: groupLatestByStation,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Counts for the tiles above the table. Unaffected by filters. */
export function useAircraftStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.aircraft.stats,
    queryFn: aircraftService.stats,
    ...queryPresets.standard,
    ...options,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Counts for the tiles above the table. Unaffected by filters. */
export function useAirportStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.airports.stats,
    queryFn: airportsService.stats,
    ...queryPresets.standard,
    ...options,
  });
}

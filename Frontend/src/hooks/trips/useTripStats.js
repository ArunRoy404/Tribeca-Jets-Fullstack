"use client";

import { useQuery } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The board tiles, counted by the API within the caller's scope. */
export function useTripStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.trips.stats,
    queryFn: () => tripsService.stats(),
    ...queryPresets.standard,
    ...options,
  });
}

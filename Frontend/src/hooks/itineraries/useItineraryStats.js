"use client";

import { useQuery } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The board tiles, counted by the API within the caller's scope. */
export function useItineraryStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.itineraries.stats,
    queryFn: () => itinerariesService.stats(),
    ...queryPresets.standard,
    ...options,
  });
}

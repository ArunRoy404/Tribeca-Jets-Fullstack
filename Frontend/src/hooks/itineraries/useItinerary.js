"use client";

import { useQuery } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One itinerary. Archived documents load too — the Archived tab links straight here. */
export function useItinerary(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.itineraries.detail(id),
    queryFn: () => itinerariesService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

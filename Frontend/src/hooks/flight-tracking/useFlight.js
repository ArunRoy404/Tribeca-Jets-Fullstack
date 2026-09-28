"use client";

import { useQuery } from "@tanstack/react-query";
import { flightTrackingService } from "@/services/flightTracking.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One flight, for its panel — archived legs and trips load too. */
export function useFlight(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.flights.detail(id),
    queryFn: () => flightTrackingService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

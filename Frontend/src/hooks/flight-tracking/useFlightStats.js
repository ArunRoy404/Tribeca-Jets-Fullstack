"use client";

import { useQuery } from "@tanstack/react-query";
import { flightTrackingService } from "@/services/flightTracking.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The board tiles, counted by the API with the browser's own day as today. */
export function useFlightStats(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.flights.stats(params),
    queryFn: () => flightTrackingService.stats(params),
    ...queryPresets.standard,
    ...options,
  });
}

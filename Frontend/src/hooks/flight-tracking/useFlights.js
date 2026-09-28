"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { flightTrackingService } from "@/services/flightTracking.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of flights (trip legs) with their hand-reported state. */
export function useFlights(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.flights.list(params),
    queryFn: () => flightTrackingService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

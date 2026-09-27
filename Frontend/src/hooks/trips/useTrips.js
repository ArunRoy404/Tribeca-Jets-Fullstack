"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A page of trips. Also what a related record's Trips tab reads — the client,
 * the operator and the aircraft each pass their own id as a filter rather than
 * carrying a copy of their trips.
 */
export function useTrips(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.trips.list(params),
    queryFn: () => tripsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

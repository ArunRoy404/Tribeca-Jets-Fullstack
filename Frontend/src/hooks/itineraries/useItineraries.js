"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { itinerariesService } from "@/services/itineraries.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of itineraries. */
export function useItineraries(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.itineraries.list(params),
    queryFn: () => itinerariesService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

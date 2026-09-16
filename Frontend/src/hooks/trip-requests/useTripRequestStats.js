"use client";

import { useQuery } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Counts and pipeline value, scoped to the caller like the list. */
export function useTripRequestStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.tripRequests.stats,
    queryFn: tripRequestsService.stats,
    ...queryPresets.standard,
    ...options,
  });
}

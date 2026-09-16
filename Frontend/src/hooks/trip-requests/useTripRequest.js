"use client";

import { useQuery } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One trip request. Idle until an id is selected. */
export function useTripRequest(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.tripRequests.detail(id),
    queryFn: () => tripRequestsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

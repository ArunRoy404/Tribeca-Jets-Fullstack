"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A page of trip requests — the enquiries behind the leads.
 *
 * Scoped server-side: a broker sees their own plus anything not yet assigned,
 * so the counts always agree with the rows underneath them.
 */
export function useTripRequests(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.tripRequests.list(params),
    queryFn: () => tripRequestsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

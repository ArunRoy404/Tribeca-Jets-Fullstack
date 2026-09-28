"use client";

import { useQuery } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * Invoiced, collected, outstanding and overdue over the caller's scope —
 * optionally one client (`{ clientId }`) or one trip (`{ tripId }`).
 */
export function useReceivableStats(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.receivables.stats(params),
    queryFn: () => receivablesService.stats(params),
    ...queryPresets.standard,
    ...options,
  });
}

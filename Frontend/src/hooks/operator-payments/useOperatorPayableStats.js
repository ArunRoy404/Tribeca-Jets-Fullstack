"use client";

import { useQuery } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * Payable, paid, outstanding, overdue and due this week over the caller's
 * scope — optionally one operator (`{ operatorId }`) or one trip (`{ tripId }`).
 */
export function useOperatorPayableStats(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.operatorPayments.stats(params),
    queryFn: () => operatorPaymentsService.stats(params),
    ...queryPresets.standard,
    ...options,
  });
}

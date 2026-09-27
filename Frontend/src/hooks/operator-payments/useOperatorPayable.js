"use client";

import { useQuery } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One operator bill, with its live and withdrawn payments. */
export function useOperatorPayable(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.operatorPayments.detail(id),
    queryFn: () => operatorPaymentsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

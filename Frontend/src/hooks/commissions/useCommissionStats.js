"use client";

import { useQuery } from "@tanstack/react-query";
import { commissionsService } from "@/services/commissions.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Pending, earned, paid, total and average — over the caller's own scope. */
export function useCommissionStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.commissions.stats,
    queryFn: () => commissionsService.stats(),
    ...queryPresets.standard,
    ...options,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { commissionsService } from "@/services/commissions.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One commission. */
export function useCommission(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.commissions.detail(id),
    queryFn: () => commissionsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

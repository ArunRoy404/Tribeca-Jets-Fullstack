"use client";

import { useQuery } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One invoice, with its live and withdrawn payments. */
export function useReceivable(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.receivables.detail(id),
    queryFn: () => receivablesService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

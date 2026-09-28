"use client";

import { useQuery } from "@tanstack/react-query";
import { emptyLegsService } from "@/services/emptyLegs.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One empty leg with its matches (#10b). Archived legs load too. */
export function useEmptyLeg(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.emptyLegs.detail(id),
    queryFn: () => emptyLegsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

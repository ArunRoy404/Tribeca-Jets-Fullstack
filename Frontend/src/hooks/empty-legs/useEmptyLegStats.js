"use client";

import { useQuery } from "@tanstack/react-query";
import { emptyLegsService } from "@/services/emptyLegs.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The board tiles, counted by the API. */
export function useEmptyLegStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.emptyLegs.stats,
    queryFn: () => emptyLegsService.stats(),
    ...queryPresets.standard,
    ...options,
  });
}

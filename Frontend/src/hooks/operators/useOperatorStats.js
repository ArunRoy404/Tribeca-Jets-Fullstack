"use client";

import { useQuery } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Counts for the tiles above the table. Unaffected by filters. */
export function useOperatorStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.operators.stats,
    queryFn: operatorsService.stats,
    ...queryPresets.standard,
    ...options,
  });
}

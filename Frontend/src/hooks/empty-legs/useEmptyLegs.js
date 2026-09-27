"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { emptyLegsService } from "@/services/emptyLegs.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of empty legs, each with its match counts. */
export function useEmptyLegs(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.emptyLegs.list(params),
    queryFn: () => emptyLegsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

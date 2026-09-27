"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { commissionsService } from "@/services/commissions.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of commissions — scoped and, for a referral agent, projected by the API. */
export function useCommissions(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.commissions.list(params),
    queryFn: () => commissionsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

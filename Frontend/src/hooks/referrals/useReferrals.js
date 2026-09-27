"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of referrals — the desk's board, or an agent's own. */
export function useReferrals(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.referrals.list(params),
    queryFn: () => referralsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

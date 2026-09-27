"use client";

import { useQuery } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Referral counts over the caller's scope — also the agent's dashboard. */
export function useReferralStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.referrals.stats,
    queryFn: () => referralsService.stats(),
    ...queryPresets.standard,
    ...options,
  });
}

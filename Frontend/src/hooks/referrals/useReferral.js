"use client";

import { useQuery } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One referral. */
export function useReferral(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.referrals.detail(id),
    queryFn: () => referralsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

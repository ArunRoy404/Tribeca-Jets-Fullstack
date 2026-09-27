"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The portal's Resources — brochure, category guide, programme terms. */
export function useReferralResources(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.referralResources.list(params),
    queryFn: () => referralsService.resources(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

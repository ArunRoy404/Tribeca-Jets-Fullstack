"use client";

import { useMutation } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Converts a referral into a CRM client and a trip request. */
export function useConvertReferral() {
  return useMutation({
    mutationFn: (payload) => referralsService.convert(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.referrals.all, queryKeys.clients.all, queryKeys.tripRequests.all);
      toastSuccess(`RF-${data?.reference} converted into a client and a trip request`);
    },
    onError: (error) => toastApiError(error, "Could not convert this referral"),
  });
}

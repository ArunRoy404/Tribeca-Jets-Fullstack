"use client";

import { useMutation } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Submits a referral. */
export function useSubmitReferral() {
  return useMutation({
    mutationFn: (payload) => referralsService.submit(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.referrals.all);
      toastSuccess(`Referral RF-${data?.reference} submitted`);
    },
    onError: (error) => toastApiError(error, "Could not submit this referral"),
  });
}

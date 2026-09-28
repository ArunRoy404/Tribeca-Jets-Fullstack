"use client";

import { useMutation } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Works a referral. Linking its trip can raise a commission, so commissions refresh too. */
export function useUpdateReferral() {
  return useMutation({
    mutationFn: (payload) => referralsService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.referrals.all, queryKeys.commissions.all);
      toastSuccess(`RF-${data?.reference} saved`);
    },
    onError: (error) => toastApiError(error, "Could not save this referral"),
  });
}

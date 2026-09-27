"use client";

import { useMutation } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Restores one archived referral or several. */
export function useRestoreReferral() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? referralsService.restoreMany(ids) : referralsService.restore(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.referrals.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Referral restored" : `${count} referrals restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this referral"),
  });
}

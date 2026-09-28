"use client";

import { useMutation } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Archives one referral or several. */
export function useRemoveReferral() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? referralsService.removeMany(ids) : referralsService.remove(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.referrals.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Referral archived" : `${count} referrals archived`);
    },
    onError: (error) => toastApiError(error, "Could not archive this referral"),
  });
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Takes a resource off the portal (`restore: true` puts it back). Never deletes. */
export function useArchiveReferralResource() {
  return useMutation({
    mutationFn: ({ id, restore }) =>
      restore ? referralsService.restoreResource(id) : referralsService.removeResource(id),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.referralResources.all);
      toastSuccess(variables?.restore ? "Resource restored" : "Resource taken off the portal");
    },
    onError: (error) => toastApiError(error, "Could not update this resource"),
  });
}

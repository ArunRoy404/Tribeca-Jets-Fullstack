"use client";

import { useMutation } from "@tanstack/react-query";
import { referralsService } from "@/services/referrals.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Publishes a resource, or edits one when `id` is given. */
export function useSaveReferralResource() {
  return useMutation({
    mutationFn: (payload) =>
      payload?.id ? referralsService.updateResource(payload) : referralsService.createResource(payload),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.referralResources.all);
      toastSuccess(variables?.id ? `"${data?.title}" saved` : `"${data?.title}" published to the portal`);
    },
    onError: (error) => toastApiError(error, "Could not save this resource"),
  });
}

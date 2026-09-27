"use client";

import { useMutation } from "@tanstack/react-query";
import { commissionsService } from "@/services/commissions.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Edits, settles or pays a commission. */
export function useUpdateCommission() {
  return useMutation({
    mutationFn: (payload) => commissionsService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.commissions.all);
      toastSuccess(`COM-${data?.reference} saved`);
    },
    onError: (error) => toastApiError(error, "Could not save this commission"),
  });
}

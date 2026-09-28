"use client";

import { useMutation } from "@tanstack/react-query";
import { commissionsService } from "@/services/commissions.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Raises a commission on a trip. */
export function useCreateCommission() {
  return useMutation({
    mutationFn: (payload) => commissionsService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.commissions.all);
      invalidate(queryKeys.transactions.all);
      toastSuccess(`Commission COM-${data?.reference} recorded`);
    },
    onError: (error) => toastApiError(error, "Could not record this commission"),
  });
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateReceivables } from "./invalidateReceivables";

/** Brings a withdrawn payment back, re-checked against the invoice as it is now. */
export function useRestorePayment() {
  return useMutation({
    mutationFn: (payload) => receivablesService.restorePayment(payload),
    onSuccess: () => {
      invalidateReceivables();
      toastSuccess("Payment restored");
    },
    onError: (error) => toastApiError(error, "Could not restore this payment"),
  });
}

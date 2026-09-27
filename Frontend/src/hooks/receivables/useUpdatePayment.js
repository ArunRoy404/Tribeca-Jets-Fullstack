"use client";

import { useMutation } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateReceivables } from "./invalidateReceivables";

/** Corrects a recorded payment. Takes `{ invoiceId, paymentId, ...changes }`. */
export function useUpdatePayment() {
  return useMutation({
    mutationFn: (payload) => receivablesService.updatePayment(payload),
    onSuccess: () => {
      invalidateReceivables();
      toastSuccess("Payment corrected");
    },
    onError: (error) => toastApiError(error, "Could not correct this payment"),
  });
}

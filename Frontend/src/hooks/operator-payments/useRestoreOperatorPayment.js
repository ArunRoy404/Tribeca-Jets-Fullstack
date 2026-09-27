"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateOperatorPayments } from "./invalidateOperatorPayments";

/** Brings a withdrawn payment back, re-checked against the bill as it is now. */
export function useRestoreOperatorPayment() {
  return useMutation({
    mutationFn: (payload) => operatorPaymentsService.restorePayment(payload),
    onSuccess: () => {
      invalidateOperatorPayments();
      toastSuccess("Payment restored");
    },
    onError: (error) => toastApiError(error, "Could not restore this payment"),
  });
}

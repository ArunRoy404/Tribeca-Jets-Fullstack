"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateOperatorPayments } from "./invalidateOperatorPayments";

/** Takes a mistaken payment off the record. It stays listed as withdrawn. */
export function useWithdrawOperatorPayment() {
  return useMutation({
    mutationFn: (payload) => operatorPaymentsService.withdrawPayment(payload),
    onSuccess: () => {
      invalidateOperatorPayments();
      toastSuccess("Payment withdrawn");
    },
    onError: (error) => toastApiError(error, "Could not withdraw this payment"),
  });
}

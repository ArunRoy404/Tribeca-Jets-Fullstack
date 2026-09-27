"use client";

import { useMutation } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateReceivables } from "./invalidateReceivables";

/** Takes a mistaken payment off the record. It stays listed as withdrawn. */
export function useWithdrawPayment() {
  return useMutation({
    mutationFn: (payload) => receivablesService.withdrawPayment(payload),
    onSuccess: () => {
      invalidateReceivables();
      toastSuccess("Payment withdrawn");
    },
    onError: (error) => toastApiError(error, "Could not withdraw this payment"),
  });
}

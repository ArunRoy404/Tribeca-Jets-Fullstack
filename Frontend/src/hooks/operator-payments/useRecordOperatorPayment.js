"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateOperatorPayments } from "./invalidateOperatorPayments";

/** Records money sent to an operator. Takes `{ payableId, ...payment }`. */
export function useRecordOperatorPayment() {
  return useMutation({
    mutationFn: (payload) => operatorPaymentsService.recordPayment(payload),
    onSuccess: (data) => {
      invalidateOperatorPayments();
      toastSuccess(`Payment recorded on ${data?.number ?? "the bill"}`);
    },
    onError: (error) => toastApiError(error, "Could not record this payment"),
  });
}

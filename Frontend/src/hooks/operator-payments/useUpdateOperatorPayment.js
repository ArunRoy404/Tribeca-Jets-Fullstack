"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateOperatorPayments } from "./invalidateOperatorPayments";

/** Corrects a recorded payment. Takes `{ payableId, paymentId, ...changes }`. */
export function useUpdateOperatorPayment() {
  return useMutation({
    mutationFn: (payload) => operatorPaymentsService.updatePayment(payload),
    onSuccess: () => {
      invalidateOperatorPayments();
      toastSuccess("Payment corrected");
    },
    onError: (error) => toastApiError(error, "Could not correct this payment"),
  });
}

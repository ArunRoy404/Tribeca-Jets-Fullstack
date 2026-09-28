"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateOperatorPayments } from "./invalidateOperatorPayments";

/** Records an operator's bill on a trip. */
export function useCreateOperatorPayable() {
  return useMutation({
    mutationFn: (payload) => operatorPaymentsService.create(payload),
    onSuccess: (data) => {
      invalidateOperatorPayments();
      toastSuccess(data?.number ? `Operator bill ${data.number} recorded` : "Operator bill recorded");
    },
    onError: (error) => toastApiError(error, "Could not record this bill"),
  });
}

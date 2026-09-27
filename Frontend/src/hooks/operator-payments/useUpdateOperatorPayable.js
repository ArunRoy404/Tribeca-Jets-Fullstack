"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateOperatorPayments } from "./invalidateOperatorPayments";

/** Edits or cancels an operator bill. */
export function useUpdateOperatorPayable() {
  return useMutation({
    mutationFn: (payload) => operatorPaymentsService.update(payload),
    onSuccess: (data) => {
      invalidateOperatorPayments();
      toastSuccess(`${data?.number ?? "Bill"} saved`);
    },
    onError: (error) => toastApiError(error, "Could not save this bill"),
  });
}

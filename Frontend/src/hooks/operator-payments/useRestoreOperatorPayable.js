"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateOperatorPayments } from "./invalidateOperatorPayments";

/** Restores one archived bill or several. */
export function useRestoreOperatorPayable() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? operatorPaymentsService.restoreMany(ids) : operatorPaymentsService.restore(ids)),
    onSuccess: (data, variables) => {
      invalidateOperatorPayments();
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Bill restored" : `${count} bills restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this bill"),
  });
}

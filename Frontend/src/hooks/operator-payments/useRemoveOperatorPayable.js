"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorPaymentsService } from "@/services/operatorPayments.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateOperatorPayments } from "./invalidateOperatorPayments";

/** Archives one bill or several. In bulk, a bill carrying payments is skipped by the API, and the toast says so. */
export function useRemoveOperatorPayable() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? operatorPaymentsService.removeMany(ids) : operatorPaymentsService.remove(ids)),
    onSuccess: (data, variables) => {
      invalidateOperatorPayments();
      if (!Array.isArray(variables)) {
        toastSuccess("Bill archived");
        return;
      }
      const count = data?.affected ?? variables.length;
      const skipped = variables.length - count;
      toastSuccess(
        `${count} ${count === 1 ? "bill" : "bills"} archived` + (skipped > 0 ? ` · ${skipped} skipped (payments recorded)` : ""),
      );
    },
    onError: (error) => toastApiError(error, "Could not archive this bill"),
  });
}

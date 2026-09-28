"use client";

import { useMutation } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateReceivables } from "./invalidateReceivables";

/** Restores one archived invoice or several. */
export function useRestoreReceivable() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? receivablesService.restoreMany(ids) : receivablesService.restore(ids)),
    onSuccess: (data, variables) => {
      invalidateReceivables();
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Invoice restored" : `${count} invoices restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this invoice"),
  });
}

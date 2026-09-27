"use client";

import { useMutation } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateReceivables } from "./invalidateReceivables";

/**
 * Archives one invoice or several. In bulk, an invoice carrying payments is
 * skipped by the API rather than refused, and the toast says how many moved.
 */
export function useRemoveReceivable() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? receivablesService.removeMany(ids) : receivablesService.remove(ids)),
    onSuccess: (data, variables) => {
      invalidateReceivables();
      if (!Array.isArray(variables)) {
        toastSuccess("Invoice archived");
        return;
      }
      const count = data?.affected ?? variables.length;
      const skipped = variables.length - count;
      toastSuccess(
        `${count} ${count === 1 ? "invoice" : "invoices"} archived` +
          (skipped > 0 ? ` · ${skipped} skipped (payments recorded)` : ""),
      );
    },
    onError: (error) => toastApiError(error, "Could not archive this invoice"),
  });
}

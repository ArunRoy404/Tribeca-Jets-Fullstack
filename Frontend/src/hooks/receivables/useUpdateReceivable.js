"use client";

import { useMutation } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateReceivables } from "./invalidateReceivables";

/** Edits an invoice, sends it or cancels it. */
export function useUpdateReceivable() {
  return useMutation({
    mutationFn: (payload) => receivablesService.update(payload),
    onSuccess: (data) => {
      invalidateReceivables();
      toastSuccess(`${data?.number ?? "Invoice"} saved`);
    },
    onError: (error) => toastApiError(error, "Could not save this invoice"),
  });
}

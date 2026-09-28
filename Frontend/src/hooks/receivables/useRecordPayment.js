"use client";

import { useMutation } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateReceivables } from "./invalidateReceivables";

/** Records money received against an invoice. Takes `{ invoiceId, ...payment }`. */
export function useRecordPayment() {
  return useMutation({
    mutationFn: (payload) => receivablesService.recordPayment(payload),
    onSuccess: (data) => {
      invalidateReceivables();
      toastSuccess(`Payment recorded on ${data?.number ?? "the invoice"}`);
    },
    onError: (error) => toastApiError(error, "Could not record this payment"),
  });
}

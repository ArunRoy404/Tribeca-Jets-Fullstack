"use client";

import { useMutation } from "@tanstack/react-query";
import { receivablesService } from "@/services/receivables.service";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { invalidateReceivables } from "./invalidateReceivables";

/** Raises an invoice on a trip. */
export function useCreateReceivable() {
  return useMutation({
    mutationFn: (payload) => receivablesService.create(payload),
    onSuccess: (data) => {
      invalidateReceivables();
      toastSuccess(data?.number ? `Invoice ${data.number} raised` : "Invoice raised");
    },
    onError: (error) => toastApiError(error, "Could not raise this invoice"),
  });
}

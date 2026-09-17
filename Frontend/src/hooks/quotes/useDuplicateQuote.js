"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Copies a quote into a fresh draft — same figures, none of the history. */
export function useDuplicateQuote() {
  return useMutation({
    mutationFn: (id) => quotesService.duplicate(id),
    onSuccess: (data) => {
      invalidate(queryKeys.quotes.all);
      toastSuccess(`Copied into a new draft, Q-${data?.reference}`);
    },
    onError: (error) => toastApiError(error, "Could not copy this quote"),
  });
}

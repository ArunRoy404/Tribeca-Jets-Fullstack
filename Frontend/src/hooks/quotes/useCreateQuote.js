"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Writes a new quote. Always a draft — nothing reaches a client by being saved. */
export function useCreateQuote() {
  return useMutation({
    mutationFn: (payload) => quotesService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.quotes.all);
      // The client detail page's Quotes tab counts these.
      invalidate(queryKeys.clients.all);
      toastSuccess(`Quote Q-${data?.reference} saved as a draft`);
    },
    onError: (error) => toastApiError(error, "Could not save this quote"),
  });
}

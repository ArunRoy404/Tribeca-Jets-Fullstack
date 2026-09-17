"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Edits a quote.
 *
 * The versions cache is invalidated too: an edit that moves the money cuts a
 * new snapshot, and the history card would otherwise keep showing the old one.
 */
export function useUpdateQuote() {
  return useMutation({
    mutationFn: (payload) => quotesService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.quotes.all);
      toastSuccess(
        data?.version > 1
          ? `Quote updated — now version ${data.version}`
          : "Quote updated",
      );
    },
    onError: (error) => toastApiError(error, "Could not update this quote"),
  });
}

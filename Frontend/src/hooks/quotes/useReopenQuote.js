"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Undoes a decision, so a mis-click on Approve is fixable.
 *
 * The quote goes back to where it was — sent if the client has seen it, draft
 * if it never went out — which is why there is no "mark as draft" anywhere.
 */
export function useReopenQuote() {
  return useMutation({
    mutationFn: (id) => quotesService.reopen(id),
    onSuccess: (data) => {
      invalidate(queryKeys.quotes.all);
      toastSuccess(
        data?.status === "DRAFT" ? "Quote reopened as a draft" : "Quote reopened",
      );
    },
    onError: (error) => toastApiError(error, "Could not reopen this quote"),
  });
}

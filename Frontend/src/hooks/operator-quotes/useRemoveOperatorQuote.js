"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Archives a quote. Administrators only — a broker who has stopped working a
 * quote rejects it, which keeps it in the comparison and the scorecard.
 */
export function useRemoveOperatorQuote() {
  return useMutation({
    mutationFn: (quote) => operatorQuotesService.remove(quote?.id ?? quote),
    onSuccess: () => {
      invalidate(queryKeys.operatorQuotes.all);
      invalidate(queryKeys.tripRequests.all);
      toastSuccess("Quote removed");
    },
    onError: (error) => toastApiError(error, "Could not remove this quote"),
  });
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Brings an archived quote back.
 *
 * Fails with a 409 if the operator has since been asked again for the same
 * request — one live ask per operator per enquiry — and the message says so.
 */
export function useRestoreOperatorQuote() {
  return useMutation({
    mutationFn: (quote) => operatorQuotesService.restore(quote?.id ?? quote),
    onSuccess: () => {
      invalidate(queryKeys.operatorQuotes.all);
      invalidate(queryKeys.tripRequests.all);
      toastSuccess("Quote restored");
    },
    onError: (error) => toastApiError(error, "Could not restore this quote"),
  });
}

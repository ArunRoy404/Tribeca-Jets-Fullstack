"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Corrects the ask or the recorded answer. Never moves the quote's state. */
export function useUpdateOperatorQuote() {
  return useMutation({
    mutationFn: (payload) => operatorQuotesService.update(payload),
    onSuccess: () => {
      invalidate(queryKeys.operatorQuotes.all);
      invalidate(queryKeys.tripRequests.all);
      toastSuccess("Quote updated");
    },
    onError: (error) => toastApiError(error, "Could not update this quote"),
  });
}

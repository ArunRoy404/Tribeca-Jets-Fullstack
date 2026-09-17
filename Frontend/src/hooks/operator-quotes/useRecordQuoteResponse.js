"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Records what the operator came back with.
 *
 * Stamps the response clock server-side, which is what the operator scorecard
 * measures — so the operators cache is invalidated alongside.
 */
export function useRecordQuoteResponse() {
  return useMutation({
    mutationFn: (payload) => operatorQuotesService.recordResponse(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.operatorQuotes.all);
      invalidate(queryKeys.tripRequests.all);
      invalidate(queryKeys.operators.all);
      toastSuccess(`Response from ${data?.operator?.name ?? "the operator"} recorded`);
    },
    onError: (error) => toastApiError(error, "Could not record this response"),
  });
}

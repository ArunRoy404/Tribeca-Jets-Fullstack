"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Sends a request to an operator.
 *
 * Also moves the enquiry to SOURCING server-side, so the trip-requests cache
 * is invalidated too — the board's status column and its "3 contacted, 2
 * responded" counts both come from there.
 */
export function useAskOperator() {
  return useMutation({
    mutationFn: (payload) => operatorQuotesService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.operatorQuotes.all);
      invalidate(queryKeys.tripRequests.all);
      // The operator's scorecard counts every ask.
      invalidate(queryKeys.operators.all);
      toastSuccess(`Request sent to ${data?.operator?.name ?? "the operator"}`);
    },
    onError: (error) => toastApiError(error, "Could not send this request"),
  });
}

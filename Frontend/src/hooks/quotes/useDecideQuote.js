"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

const ACTIONS = {
  approve: { call: quotesService.approve, done: "Quote approved" },
  reject: { call: quotesService.reject, done: "Quote marked as rejected" },
  expire: { call: quotesService.expire, done: "Quote marked as expired" },
};

/**
 * Records the client's answer, or lets the offer lapse.
 *
 * One hook for the three, because they differ only in the endpoint and the
 * toast — three near-identical files would be the duplication the rules
 * forbid. `reopen` is separate: it undoes rather than decides.
 *
 * ```js
 * const decide = useDecideQuote();
 * decide.mutate({ action: "approve", id, decisionNote });
 * ```
 */
export function useDecideQuote() {
  return useMutation({
    mutationFn: ({ action, ...payload }) => {
      const chosen = ACTIONS[action];
      if (!chosen) {
        return Promise.reject(new Error(`Unknown quote action: ${action}`));
      }
      return chosen.call(payload);
    },
    onSuccess: (_data, variables) => {
      invalidate(queryKeys.quotes.all);
      invalidate(queryKeys.tripRequests.all);
      toastSuccess(ACTIONS[variables?.action]?.done ?? "Quote updated");
    },
    onError: (error) => toastApiError(error, "Could not record that decision"),
  });
}

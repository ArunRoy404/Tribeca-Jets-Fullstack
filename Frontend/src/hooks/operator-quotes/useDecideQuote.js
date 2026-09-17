"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Approve, reject, decline or reopen — one hook, because all four are the same
 * shape and the same invalidation, and four near-identical files would drift.
 *
 * Approving also moves the enquiry to QUOTED server-side, and every decision
 * counts towards the operator's win rate, so both caches are cleared.
 *
 * Usage: `decide({ id, action: "approve", decisionNote })`.
 */
const ACTIONS = {
  approve: {
    call: operatorQuotesService.approve,
    message: (data) => `${data?.operator?.name ?? "Operator"} approved`,
    error: "Could not approve this quote",
  },
  reject: {
    call: operatorQuotesService.reject,
    message: (data) => `${data?.operator?.name ?? "Quote"} rejected`,
    error: "Could not reject this quote",
  },
  decline: {
    call: operatorQuotesService.decline,
    message: (data) => `${data?.operator?.name ?? "Operator"} marked as declined`,
    error: "Could not record this decline",
  },
  reopen: {
    call: ({ id }) => operatorQuotesService.reopen(id),
    message: () => "Decision undone",
    error: "Could not reopen this quote",
  },
};

export function useDecideQuote() {
  return useMutation({
    mutationFn: ({ action, ...payload }) =>
      ACTIONS[action].call(payload).then((data) => ({ data, action })),
    onSuccess: ({ data, action }) => {
      invalidate(queryKeys.operatorQuotes.all);
      invalidate(queryKeys.tripRequests.all);
      invalidate(queryKeys.operators.all);
      toastSuccess(ACTIONS[action].message(data));
    },
    onError: (error, variables) =>
      toastApiError(error, ACTIONS[variables?.action]?.error ?? "Could not update this quote"),
  });
}

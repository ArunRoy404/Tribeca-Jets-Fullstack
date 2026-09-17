"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Archives one quote or several.
 *
 * Soft, always — the quote moves to the Archived tab and can be brought back.
 * Never the way to record "the client said no": that is reject, which keeps the
 * quote where the desk's conversion rate is counted.
 */
export function useRemoveQuote() {
  return useMutation({
    mutationFn: (ids) =>
      Array.isArray(ids) ? quotesService.removeMany(ids) : quotesService.remove(ids),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.quotes.all);
      invalidate(queryKeys.clients.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Quote archived" : `${count} quotes archived`);
    },
    onError: (error) => toastApiError(error, "Could not archive this quote"),
  });
}

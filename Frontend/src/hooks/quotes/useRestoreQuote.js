"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Brings archived quotes back, with their version history intact. */
export function useRestoreQuote() {
  return useMutation({
    mutationFn: (ids) =>
      Array.isArray(ids) ? quotesService.restoreMany(ids) : quotesService.restore(ids),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.quotes.all);
      invalidate(queryKeys.clients.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Quote restored" : `${count} quotes restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this quote"),
  });
}

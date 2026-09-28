"use client";

import { useMutation } from "@tanstack/react-query";
import { clientCreditsService } from "@/services/clientCredits.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Takes a movement off the ledger. Soft — it stays readable in the withdrawn
 * view, with who removed it.
 *
 * Invalidates the whole `client-credits` prefix, never just the ledger: the
 * balance above it is the same rows read a second way, and a stale balance on
 * a money screen is the one thing nobody checks and everybody trusts.
 */
export function useRemoveCredit() {
  return useMutation({
    mutationFn: clientCreditsService.remove,
    onSuccess: () => {
      invalidate(queryKeys.clientCredits.all);
      toastSuccess("Movement withdrawn", "It no longer counts towards the balance.");
    },
    onError: (error) => toastApiError(error, "Could not withdraw that movement"),
  });
}

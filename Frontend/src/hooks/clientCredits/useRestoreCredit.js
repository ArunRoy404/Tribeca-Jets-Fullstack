"use client";

import { useMutation } from "@tanstack/react-query";
import { clientCreditsService } from "@/services/clientCredits.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Puts a withdrawn movement back. The API re-checks the balance, because the
 * ledger may have moved on while it was off.
 *
 * Invalidates the whole `client-credits` prefix, never just the ledger: the
 * balance above it is the same rows read a second way, and a stale balance on
 * a money screen is the one thing nobody checks and everybody trusts.
 */
export function useRestoreCredit() {
  return useMutation({
    mutationFn: clientCreditsService.restore,
    onSuccess: () => {
      invalidate(queryKeys.clientCredits.all);
      toastSuccess("Movement restored");
    },
    onError: (error) => toastApiError(error, "Could not restore that movement"),
  });
}

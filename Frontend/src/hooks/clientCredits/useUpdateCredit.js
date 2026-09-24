"use client";

import { useMutation } from "@tanstack/react-query";
import { clientCreditsService } from "@/services/clientCredits.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * The "can always edit that number" half of the request — on an entry, so the
 * change keeps a trail.
 *
 * Invalidates the whole `client-credits` prefix, never just the ledger: the
 * balance above it is the same rows read a second way, and a stale balance on
 * a money screen is the one thing nobody checks and everybody trusts.
 */
export function useUpdateCredit() {
  return useMutation({
    mutationFn: clientCreditsService.update,
    onSuccess: () => {
      invalidate(queryKeys.clientCredits.all);
      toastSuccess("Movement updated");
    },
    onError: (error) => toastApiError(error, "Could not update that movement"),
  });
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { clientCreditsService } from "@/services/clientCredits.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Puts money onto an account or takes it off towards a trip.
 *
 * Invalidates the whole `client-credits` prefix, never just the ledger: the
 * balance above it is the same rows read a second way, and a stale balance on
 * a money screen is the one thing nobody checks and everybody trusts.
 */
export function useCreateCredit() {
  return useMutation({
    mutationFn: clientCreditsService.create,
    onSuccess: () => {
      invalidate(queryKeys.clientCredits.all);
      toastSuccess("Movement recorded");
    },
    onError: (error) => toastApiError(error, "Could not record that movement"),
  });
}

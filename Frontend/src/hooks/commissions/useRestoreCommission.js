"use client";

import { useMutation } from "@tanstack/react-query";
import { commissionsService } from "@/services/commissions.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Restores one archived commission or several. */
export function useRestoreCommission() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? commissionsService.restoreMany(ids) : commissionsService.restore(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.commissions.all);
      invalidate(queryKeys.transactions.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Commission restored" : `${count} commissions restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this commission"),
  });
}

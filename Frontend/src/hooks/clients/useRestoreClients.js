"use client";

import { useMutation } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Restores several clients at once. Call with an array of ids.
 *
 * Partial success is reported, not treated as failure: ids that matched
 * nothing come back in `skipped`, because two people acting on the same
 * selection should both succeed.
 */
export function useRestoreClients() {
  return useMutation({
    mutationFn: (ids) => clientsService.restoreMany(ids),
    onSuccess: (result) => {
      invalidate(queryKeys.clients.all);

      const count = result?.affected ?? 0;
      toastSuccess(`${count} ${count === 1 ? "client" : "clients"} restored`);

      const skipped = result?.skipped?.length ?? 0;
      if (skipped) {
        toastInfo(
          `${skipped} ${skipped === 1 ? "row was" : "rows were"} already restored`,
          "Someone else may have got there first.",
        );
      }
    },
    onError: (error) => toastApiError(error, "Could not restore these clients"),
  });
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Restores several archived airports at once. Call with an array of ids.
 *
 * The mirror of `useRemoveAirports`, and it reports partial success the same
 * way: ids that were not archived come back as `skipped` rather than failing
 * the batch, because two people restoring the same selection should both
 * succeed.
 */
export function useRestoreAirports() {
  return useMutation({
    mutationFn: (ids) => airportsService.restoreMany(ids),
    onSuccess: (result) => {
      invalidate(queryKeys.airports.all);

      const restored = result?.affected ?? 0;
      toastSuccess(
        `${restored} ${restored === 1 ? "airport" : "airports"} restored`,
      );

      const skipped = result?.skipped?.length ?? 0;
      if (skipped) {
        toastInfo(
          `${skipped} ${skipped === 1 ? "row was" : "rows were"} already restored`,
          "Someone else may have restored them first.",
        );
      }
    },
    onError: (error) => toastApiError(error, "Could not restore these airports"),
  });
}

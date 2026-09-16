"use client";

import { useMutation } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Restores several archived aircraft at once. Call with an array of ids.
 *
 * The mirror of `useRemoveManyAircraft`, reporting partial success the same
 * way — ids that were not archived are `skipped` rather than failing the batch.
 */
export function useRestoreManyAircraft() {
  return useMutation({
    mutationFn: (ids) => aircraftService.restoreMany(ids),
    onSuccess: (result) => {
      invalidate(queryKeys.aircraft.all);
      invalidate(queryKeys.operators.all);

      const restored = result?.affected ?? 0;
      toastSuccess(`${restored} aircraft restored`);

      const skipped = result?.skipped?.length ?? 0;
      if (skipped) {
        toastInfo(
          `${skipped} ${skipped === 1 ? "row was" : "rows were"} already restored`,
          "Someone else may have restored them first.",
        );
      }
    },
    onError: (error) => toastApiError(error, "Could not restore these aircraft"),
  });
}

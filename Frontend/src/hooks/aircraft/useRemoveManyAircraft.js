"use client";

import { useMutation } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Removes several aircraft at once. Call with an array of ids.
 *
 * Partial success is reported, not treated as failure: ids that were already
 * archived come back as `skipped`, because two people clearing the same
 * selection should both succeed.
 */
export function useRemoveManyAircraft() {
  return useMutation({
    mutationFn: (ids) => aircraftService.removeMany(ids),
    onSuccess: (result) => {
      invalidate(queryKeys.aircraft.all);
      invalidate(queryKeys.operators.all);

      const removed = result?.affected ?? 0;
      toastSuccess(`${removed} aircraft removed`);

      const skipped = result?.skipped?.length ?? 0;
      if (skipped) {
        toastInfo(
          `${skipped} ${skipped === 1 ? "row was" : "rows were"} already removed`,
          "Someone else may have removed them first.",
        );
      }
    },
    onError: (error) => toastApiError(error, "Could not remove these aircraft"),
  });
}

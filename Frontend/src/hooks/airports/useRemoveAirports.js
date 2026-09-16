"use client";

import { useMutation } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Removes several airports at once. Call with an array of ids.
 *
 * The API reports partial success rather than failing the batch, so a row that
 * someone else already removed is surfaced as a note instead of an error —
 * the click still did what the user asked of the rows that remained.
 */
export function useRemoveAirports() {
  return useMutation({
    mutationFn: (ids) => airportsService.removeMany(ids),
    onSuccess: (result) => {
      invalidate(queryKeys.airports.all);

      const deleted = result?.deleted ?? 0;
      toastSuccess(
        `${deleted} ${deleted === 1 ? "airport" : "airports"} removed`,
        "Add one again with the same ICAO to restore it.",
      );

      const skipped = result?.skipped?.length ?? 0;
      if (skipped) {
        toastInfo(
          `${skipped} ${skipped === 1 ? "row was" : "rows were"} already removed`,
          "Someone else may have removed them first.",
        );
      }
    },
    onError: (error) => toastApiError(error, "Could not remove these airports"),
  });
}

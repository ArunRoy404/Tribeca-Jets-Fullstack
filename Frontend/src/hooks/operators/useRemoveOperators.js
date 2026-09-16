"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastInfo, toastSuccess } from "@/lib/toast";

/**
 * Removes several operators at once. Call with an array of ids.
 *
 * Partial success is reported, not treated as failure — see
 * `useRemoveAirports` for why.
 */
export function useRemoveOperators() {
  return useMutation({
    mutationFn: (ids) => operatorsService.removeMany(ids),
    onSuccess: (result) => {
      invalidate(queryKeys.operators.all);

      const deleted = result?.deleted ?? 0;
      toastSuccess(`${deleted} ${deleted === 1 ? "operator" : "operators"} removed`);

      const skipped = result?.skipped?.length ?? 0;
      if (skipped) {
        toastInfo(
          `${skipped} ${skipped === 1 ? "row was" : "rows were"} already removed`,
          "Someone else may have removed them first.",
        );
      }
    },
    onError: (error) => toastApiError(error, "Could not remove these operators"),
  });
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { emptyLegsService } from "@/services/emptyLegs.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Archives one empty leg or several. */
export function useRemoveEmptyLeg() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? emptyLegsService.removeMany(ids) : emptyLegsService.remove(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.emptyLegs.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Empty leg archived" : `${count} empty legs archived`);
    },
    onError: (error) => toastApiError(error, "Could not archive this empty leg"),
  });
}

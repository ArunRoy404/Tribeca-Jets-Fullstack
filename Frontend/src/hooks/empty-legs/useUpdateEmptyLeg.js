"use client";

import { useMutation } from "@tanstack/react-query";
import { emptyLegsService } from "@/services/emptyLegs.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Edits an empty leg, or records Match / Book / Expire through `status`. */
export function useUpdateEmptyLeg() {
  return useMutation({
    mutationFn: (payload) => emptyLegsService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.emptyLegs.all);
      toastSuccess(`EL-${data?.reference} saved`);
    },
    onError: (error) => toastApiError(error, "Could not save this empty leg"),
  });
}

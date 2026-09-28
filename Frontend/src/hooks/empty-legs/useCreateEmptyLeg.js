"use client";

import { useMutation } from "@tanstack/react-query";
import { emptyLegsService } from "@/services/emptyLegs.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Adds an empty leg. */
export function useCreateEmptyLeg() {
  return useMutation({
    mutationFn: (payload) => emptyLegsService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.emptyLegs.all);
      toastSuccess(`Empty leg EL-${data?.reference} added`);
    },
    onError: (error) => toastApiError(error, "Could not add this empty leg"),
  });
}

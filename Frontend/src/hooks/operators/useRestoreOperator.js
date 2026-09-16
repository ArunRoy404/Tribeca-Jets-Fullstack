"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Brings an archived operator back, with every field intact. */
export function useRestoreOperator() {
  return useMutation({
    mutationFn: (operator) => operatorsService.restore(operator?.id ?? operator),
    onSuccess: (data) => {
      // Both tabs change, so the whole prefix goes rather than one list.
      invalidate(queryKeys.operators.all);
      toastSuccess(`${data?.name} restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this operator"),
  });
}

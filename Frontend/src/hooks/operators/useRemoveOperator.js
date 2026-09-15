"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Removes an operator. Soft delete — trips, quotes and payments will reference
 * it, and destroying it would orphan the history of every flight it operated.
 */
export function useRemoveOperator() {
  return useMutation({
    mutationFn: (operator) => operatorsService.remove(operator?.id ?? operator),
    onSuccess: (_data, operator) => {
      invalidate(queryKeys.operators.all);
      toastSuccess(`${operator?.name ?? "Operator"} removed`);
    },
    onError: (error) => toastApiError(error, "Could not remove this operator"),
  });
}

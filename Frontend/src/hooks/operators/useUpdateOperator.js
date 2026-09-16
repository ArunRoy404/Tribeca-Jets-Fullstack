"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Updates an operator. Call with `{ id, ...changedFields }`.
 *
 * Array fields are replaced wholesale by the API, so send the complete list
 * rather than the additions.
 */
export function useUpdateOperator() {
  return useMutation({
    mutationFn: operatorsService.update,
    onSuccess: (data, variables) => {
      invalidate(queryKeys.operators.all);
      invalidate(queryKeys.operators.detail(variables?.id));
      toastSuccess(`${data?.name} updated`);
    },
    onError: (error) => toastApiError(error, "Could not update this operator"),
  });
}

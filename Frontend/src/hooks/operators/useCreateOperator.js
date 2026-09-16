"use client";

import { useMutation } from "@tanstack/react-query";
import { operatorsService } from "@/services/operators.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Adds an operator.
 *
 * Name is deliberately not unique on the API — two genuinely different
 * operators can trade under one name — so there is no duplicate error to
 * handle here.
 */
export function useCreateOperator() {
  return useMutation({
    mutationFn: operatorsService.create,
    onSuccess: (data) => {
      // The status tiles move too, so the whole prefix goes.
      invalidate(queryKeys.operators.all);
      toastSuccess(`${data?.name} added`, data?.homeBase || undefined);
    },
    onError: (error) => toastApiError(error, "Could not save this operator"),
  });
}

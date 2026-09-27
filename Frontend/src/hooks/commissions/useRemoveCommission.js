"use client";

import { useMutation } from "@tanstack/react-query";
import { commissionsService } from "@/services/commissions.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Archives one commission or several. */
export function useRemoveCommission() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? commissionsService.removeMany(ids) : commissionsService.remove(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.commissions.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Commission archived" : `${count} commissions archived`);
    },
    onError: (error) => toastApiError(error, "Could not archive this commission"),
  });
}

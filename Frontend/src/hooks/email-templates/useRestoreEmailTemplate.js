"use client";

import { useMutation } from "@tanstack/react-query";
import { emailTemplatesService } from "@/services/emailTemplates.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Restores one template or several. */
export function useRestoreEmailTemplate() {
  return useMutation({
    mutationFn: (ids) =>
      Array.isArray(ids) ? emailTemplatesService.restoreMany(ids) : emailTemplatesService.restore(ids),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.emailTemplates.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Template restored" : `${count} templates restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this template"),
  });
}

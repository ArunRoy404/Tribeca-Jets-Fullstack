"use client";

import { useMutation } from "@tanstack/react-query";
import { emailTemplatesService } from "@/services/emailTemplates.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Archives one template or several — nothing is deleted, and Archived brings them back. */
export function useRemoveEmailTemplate() {
  return useMutation({
    mutationFn: (ids) =>
      Array.isArray(ids) ? emailTemplatesService.removeMany(ids) : emailTemplatesService.remove(ids),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.emailTemplates.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Template archived" : `${count} templates archived`, "They can be restored from Archived.");
    },
    onError: (error) => toastApiError(error, "Could not archive this template"),
  });
}

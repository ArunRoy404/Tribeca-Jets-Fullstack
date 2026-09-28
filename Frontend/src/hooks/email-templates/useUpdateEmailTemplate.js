"use client";

import { useMutation } from "@tanstack/react-query";
import { emailTemplatesService } from "@/services/emailTemplates.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** An edit, or switching a template on or off. */
export function useUpdateEmailTemplate() {
  return useMutation({
    mutationFn: (payload) => emailTemplatesService.update(payload),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.emailTemplates.all);
      const onlyActive = Object.keys(variables ?? {}).every((key) => key === "id" || key === "active");
      toastSuccess(
        onlyActive ? `"${data?.name}" ${data?.active ? "switched on" : "switched off"}` : `"${data?.name}" saved`,
      );
    },
    onError: (error) => toastApiError(error, "Could not save this template"),
  });
}

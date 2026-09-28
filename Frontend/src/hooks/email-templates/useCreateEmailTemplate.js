"use client";

import { useMutation } from "@tanstack/react-query";
import { emailTemplatesService } from "@/services/emailTemplates.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function useCreateEmailTemplate() {
  return useMutation({
    mutationFn: (payload) => emailTemplatesService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.emailTemplates.all);
      toastSuccess(`"${data?.name}" added`);
    },
    onError: (error) => toastApiError(error, "Could not add this template"),
  });
}

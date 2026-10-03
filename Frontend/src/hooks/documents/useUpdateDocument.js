"use client";

import { useMutation } from "@tanstack/react-query";
import { documentsService } from "@/services/documents.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

export function useUpdateDocument() {
  return useMutation({
    mutationFn: (payload) => documentsService.update(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.documents.all);
      invalidate(queryKeys.notes.all);
      toastSuccess(`"${data?.title}" updated`);
    },
    onError: (error) => toastApiError(error, "Could not update this document"),
  });
}

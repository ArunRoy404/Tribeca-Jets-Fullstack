"use client";

import { useMutation } from "@tanstack/react-query";
import { documentsService } from "@/services/documents.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Files a document. The owner's timeline records it, so timelines are refreshed too. */
export function useCreateDocument() {
  return useMutation({
    mutationFn: (payload) => documentsService.create(payload),
    onSuccess: (data) => {
      invalidate(queryKeys.documents.all);
      invalidate(queryKeys.notes.all);
      toastSuccess(`"${data?.title}" filed`);
    },
    onError: (error) => toastApiError(error, "Could not file this document"),
  });
}

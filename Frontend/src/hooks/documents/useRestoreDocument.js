"use client";

import { useMutation } from "@tanstack/react-query";
import { documentsService } from "@/services/documents.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Restores one document or several. */
export function useRestoreDocument() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? documentsService.restoreMany(ids) : documentsService.restore(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.documents.all);
      invalidate(queryKeys.notes.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Document restored" : `${count} documents restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this document"),
  });
}

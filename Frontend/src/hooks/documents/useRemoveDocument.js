"use client";

import { useMutation } from "@tanstack/react-query";
import { documentsService } from "@/services/documents.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Archives one document or several — nothing is deleted, and the file stays in storage. */
export function useRemoveDocument() {
  return useMutation({
    mutationFn: (ids) => (Array.isArray(ids) ? documentsService.removeMany(ids) : documentsService.remove(ids)),
    onSuccess: (data, variables) => {
      invalidate(queryKeys.documents.all);
      invalidate(queryKeys.notes.all);
      const count = Array.isArray(variables) ? (data?.affected ?? variables.length) : 1;
      toastSuccess(count === 1 ? "Document archived" : `${count} documents archived`, "They can be restored from Archived.");
    },
    onError: (error) => toastApiError(error, "Could not archive this document"),
  });
}

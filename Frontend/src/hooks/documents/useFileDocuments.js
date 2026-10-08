"use client";

import { useMutation } from "@tanstack/react-query";
import { documentsService } from "@/services/documents.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastError, toastSuccess } from "@/lib/toast";

/**
 * Files several uploaded documents into one record's vault folder — the
 * "documents" area of a create or edit form (Operators first, 8 Oct 2026).
 *
 * `mutate({ owner: { operatorId } | { clientId } | { tripId }, documents })`,
 * each document `{ title, category, fileUrl }`, already uploaded. Called
 * after the record itself saved, since a new record has no id before that.
 *
 * One at a time, so the vault's audit trail reads in order, and one toast
 * for the batch. A file that fails is named and the rest still file — the
 * record is saved either way, and the folder's Documents tab can retry it.
 */
export function useFileDocuments() {
  return useMutation({
    mutationFn: async ({ owner, documents }) => {
      const filed = [];
      const failed = [];
      for (const document of documents ?? []) {
        try {
          filed.push(await documentsService.create({ ...document, ...owner }));
        } catch (error) {
          failed.push({ title: document?.title, message: error?.message });
        }
      }
      return { filed, failed };
    },
    onSuccess: ({ filed, failed }) => {
      if (filed.length) {
        invalidate(queryKeys.documents.all);
        invalidate(queryKeys.notes.all);
        toastSuccess(filed.length === 1 ? `"${filed[0]?.title}" filed` : `${filed.length} documents filed`);
      }
      if (failed.length) {
        toastError(
          failed.length === 1 ? `"${failed[0].title}" was not filed` : `${failed.length} documents were not filed`,
          failed[0].message ?? "Try again from the Documents tab.",
        );
      }
    },
  });
}

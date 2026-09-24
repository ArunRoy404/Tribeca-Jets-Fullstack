"use client";

import { useMutation } from "@tanstack/react-query";
import { notesService } from "@/services/notes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Edits a note. The API accepts this from its author only, administrators
 * included — the timeline renders a note under the name of whoever wrote it.
 */
export function useUpdateNote() {
  return useMutation({
    mutationFn: notesService.update,
    onSuccess: () => {
      invalidate(queryKeys.notes.all);
      toastSuccess("Note updated");
    },
    onError: (error) => toastApiError(error, "Could not update that note"),
  });
}

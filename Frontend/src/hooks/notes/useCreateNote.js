"use client";

import { useMutation } from "@tanstack/react-query";
import { notesService } from "@/services/notes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Writes a note onto a record's timeline.
 *
 * Invalidates the whole `notes` prefix rather than one timeline: the same note
 * belongs to the merged view and to the plain list behind the Withdrawn tab,
 * and refreshing only the one that is on screen leaves the other stale for
 * however long its cache lasts.
 */
export function useCreateNote() {
  return useMutation({
    mutationFn: notesService.create,
    onSuccess: () => {
      invalidate(queryKeys.notes.all);
      toastSuccess("Note added");
    },
    onError: (error) => toastApiError(error, "Could not add that note"),
  });
}

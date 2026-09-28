"use client";

import { useMutation } from "@tanstack/react-query";
import { notesService } from "@/services/notes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Takes a note off the timeline. Soft — it stays readable under Withdrawn,
 * with the trail of who removed it, and can be put back.
 */
export function useRemoveNote() {
  return useMutation({
    mutationFn: notesService.remove,
    onSuccess: () => {
      invalidate(queryKeys.notes.all);
      toastSuccess("Note withdrawn", "It is still readable under Withdrawn.");
    },
    onError: (error) => toastApiError(error, "Could not withdraw that note"),
  });
}

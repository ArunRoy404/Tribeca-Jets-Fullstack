"use client";

import { useMutation } from "@tanstack/react-query";
import { notesService } from "@/services/notes.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Puts a withdrawn note back on the timeline. */
export function useRestoreNote() {
  return useMutation({
    mutationFn: notesService.restore,
    onSuccess: () => {
      invalidate(queryKeys.notes.all);
      toastSuccess("Note restored");
    },
    onError: (error) => toastApiError(error, "Could not restore that note"),
  });
}

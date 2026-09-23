"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadsService } from "@/services/uploads.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Puts a file into the system and returns the record describing it.
 *
 * Call with `{ file, kind, visibility, ownerUserId, label }`. The response
 * carries a **relative** `url` — that string is what a form stores on whatever
 * record it is editing.
 *
 * Two things are deliberately quiet:
 *
 * - **A deduplicated upload is a success, not a warning.** Sending a file the
 *   server already holds returns the existing record rather than a second
 *   copy. Saying "already uploaded" would read as a failure for something that
 *   worked exactly as intended, so the toast is the same either way.
 * - **Nothing is invalidated unless the file was filed about somebody.** An
 *   upload that is about to become a form field has no list to refresh; only a
 *   document landing in a folder does.
 */
export function useUploadFile() {
  return useMutation({
    mutationFn: uploadsService.upload,
    onSuccess: (data, variables) => {
      if (variables?.ownerUserId) {
        invalidate(queryKeys.uploads.all);
      }
      toastSuccess("File uploaded", data?.label || data?.filename || undefined);
    },
    onError: (error) => toastApiError(error, "Could not upload that file"),
  });
}

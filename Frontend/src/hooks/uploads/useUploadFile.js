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
 * Three things are deliberately quiet:
 *
 * - **A deduplicated upload is a success, not a warning.** Sending a file the
 *   server already holds returns the existing record rather than a second
 *   copy. Saying "already uploaded" would read as a failure for something that
 *   worked exactly as intended, so the toast is the same either way.
 * - **Nothing is invalidated unless the file was filed about somebody.** An
 *   upload that is about to become a form field has no list to refresh; only a
 *   document landing in a folder does.
 * - **An image never toasts on success.** It already gets immediate, inline
 *   confirmation — the thumbnail brick appearing where the dropzone prompt
 *   was — so a toast on top is a second, redundant notification for the same
 *   event, and a genuinely noisy one on a `multiple` field uploading several
 *   photos in a row. A document has no equivalent inline confirmation (a
 *   file chip announces itself far less clearly than a photo does), so it
 *   keeps the toast.
 */
export function useUploadFile() {
  return useMutation({
    mutationFn: uploadsService.upload,
    onSuccess: (data, variables) => {
      if (variables?.ownerUserId) {
        invalidate(queryKeys.uploads.all);
      }
      if (variables?.kind !== "image") {
        toastSuccess("File uploaded", data?.label || data?.filename || undefined);
      }
    },
    onError: (error) => toastApiError(error, "Could not upload that file"),
  });
}

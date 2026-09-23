"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadsService } from "@/services/uploads.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Archives a stored file.
 *
 * The bytes stay in storage — nothing in this system is permanently deleted,
 * and the object is content-addressed, so it may be shared with another user
 * who uploaded the same file. The toast says "removed" rather than "deleted"
 * for the same reason the Archived tab exists: it can be brought back.
 */
export function useRemoveUpload() {
  return useMutation({
    mutationFn: uploadsService.remove,
    onSuccess: () => {
      invalidate(queryKeys.uploads.all);
      toastSuccess("Document removed", "It can be restored from the Archived tab.");
    },
    onError: (error) => toastApiError(error, "Could not remove that document"),
  });
}

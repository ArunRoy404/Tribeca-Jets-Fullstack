"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadsService } from "@/services/uploads.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Brings an archived file back. Clears the deletion stamp, nothing else. */
export function useRestoreUpload() {
  return useMutation({
    mutationFn: uploadsService.restore,
    onSuccess: () => {
      invalidate(queryKeys.uploads.all);
      toastSuccess("Document restored");
    },
    onError: (error) => toastApiError(error, "Could not restore that document"),
  });
}

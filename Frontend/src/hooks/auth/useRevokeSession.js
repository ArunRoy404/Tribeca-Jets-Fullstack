"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { invalidate } from "@/lib/queryClient";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Signs out one other device. */
export function useRevokeSession() {
  return useMutation({
    mutationFn: authService.revokeSession,
    onSuccess: () => {
      toastSuccess("Device signed out");
      invalidate(queryKeys.auth.sessionsAll);
    },
    onError: (error) => toastApiError(error, "Could not sign that device out"),
  });
}

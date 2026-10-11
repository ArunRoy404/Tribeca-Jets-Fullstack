"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";
import { setQueryData } from "@/lib/queryClient";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Saves the signed-in user's own name, phone and photo (My Account). */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (user) => {
      // The API answers with the /auth/me shape, so the nav updates at once.
      setQueryData(queryKeys.auth.currentUser, user);
      toastSuccess("Profile saved");
    },
    onError: (error) => toastApiError(error, "Could not save your profile"),
  });
}

"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { clearAllQueries } from "@/lib/queryClient";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Signs the user out.
 *
 * The cache is cleared on both success and failure: if the request failed the
 * cookies may still be gone, and leaving one user's clients and financials in
 * memory for whoever signs in next on this browser is a data leak, not a stale
 * cache.
 */
export function useLogout() {
  const router = useRouter();
  const clearFlow = useAuthStore((s) => s?.clearFlow);

  const finish = () => {
    clearAllQueries();
    clearFlow?.();
    router.replace("/sign-in");
  };

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      toastSuccess("Signed out");
      finish();
    },
    onError: (error) => {
      toastApiError(error, "Could not sign out cleanly");
      finish();
    },
  });
}

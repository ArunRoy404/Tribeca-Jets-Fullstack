"use client";

import { useMutation } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { invalidate, invalidateCurrentUser } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Saves one or more Settings sections. Call with `{ company: { … } }` — only
 * the fields that changed (`settingsPayload` builds it).
 *
 * `settings.all` covers the branding too, so a new logo or name reaches every
 * sidebar at once; a Security save refreshes the session, which is where the
 * browser reads the idle timeout and warning from.
 */
export function useUpdateSettings() {
  return useMutation({
    mutationFn: settingsService.update,
    onSuccess: (_data, variables) => {
      invalidate(queryKeys.settings.all);
      if (variables?.security) invalidateCurrentUser();
      toastSuccess("Settings saved");
    },
    onError: (error) => toastApiError(error, "Could not save the settings"),
  });
}

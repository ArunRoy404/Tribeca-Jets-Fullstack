"use client";

import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** Six form defaults, open to signed-in staff without Settings access. */
export function useDeskDefaults(options = {}) {
  return useQuery({
    queryKey: queryKeys.settings.deskDefaults,
    queryFn: settingsService.deskDefaults,
    ...queryPresets.standard,
    ...options,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The company's settings, for the Settings screens. Needs Settings · View. */
export function useSettings(options = {}) {
  return useQuery({
    queryKey: queryKeys.settings.detail,
    queryFn: settingsService.get,
    ...queryPresets.standard,
    ...options,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { emailTemplatesService } from "@/services/emailTemplates.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The four tiles above the library. */
export function useEmailTemplateStats(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.emailTemplates.stats(params),
    queryFn: () => emailTemplatesService.stats(params),
    ...queryPresets.standard,
    ...options,
  });
}

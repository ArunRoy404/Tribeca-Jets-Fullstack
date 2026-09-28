"use client";

import { useQuery } from "@tanstack/react-query";
import { emailTemplatesService } from "@/services/emailTemplates.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One template, for its sheet and the editor — archived templates load too. */
export function useEmailTemplate(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.emailTemplates.detail(id),
    queryFn: () => emailTemplatesService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

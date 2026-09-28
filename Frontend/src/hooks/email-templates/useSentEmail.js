"use client";

import { useQuery } from "@tanstack/react-query";
import { emailsService } from "@/services/emailTemplates.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One sent email, exactly as it went out. */
export function useSentEmail(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.emails.detail(id),
    queryFn: () => emailsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

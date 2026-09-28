"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { emailTemplatesService } from "@/services/emailTemplates.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of templates — the library table, or the compose form's picker. */
export function useEmailTemplates(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.emailTemplates.list(params),
    queryFn: () => emailTemplatesService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

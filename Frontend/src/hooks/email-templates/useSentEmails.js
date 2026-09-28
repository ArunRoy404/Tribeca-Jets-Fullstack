"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { emailsService } from "@/services/emailTemplates.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of the sent log, newest first. */
export function useSentEmails(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.emails.list(params),
    queryFn: () => emailsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

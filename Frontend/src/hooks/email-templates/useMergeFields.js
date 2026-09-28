"use client";

import { useQuery } from "@tanstack/react-query";
import { emailTemplatesService } from "@/services/emailTemplates.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The merge-field catalogue from the API — never a list kept in the browser. */
export function useMergeFields(options = {}) {
  return useQuery({
    queryKey: queryKeys.emailTemplates.fields,
    queryFn: () => emailTemplatesService.fields(),
    ...queryPresets.static,
    ...options,
  });
}

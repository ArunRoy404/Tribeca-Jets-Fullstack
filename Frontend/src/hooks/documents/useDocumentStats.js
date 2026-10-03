"use client";

import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/services/documents.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The vault tiles, counted by the API in the caller's scope. */
export function useDocumentStats(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.documents.stats(params),
    queryFn: () => documentsService.stats(params),
    ...queryPresets.standard,
    ...options,
  });
}

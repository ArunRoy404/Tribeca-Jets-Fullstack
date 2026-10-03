"use client";

import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/services/documents.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One document, archived ones included. */
export function useDocument(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.documents.detail(id),
    queryFn: () => documentsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

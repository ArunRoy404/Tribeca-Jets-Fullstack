"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { documentsService } from "@/services/documents.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of documents — the vault, or one folder with `clientId` / `tripId` / `operatorId`. */
export function useDocuments(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.documents.list(params),
    queryFn: () => documentsService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

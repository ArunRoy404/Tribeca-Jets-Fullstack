"use client";

import { useQuery } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One quote, archived ones included — the Archived tab links straight here. */
export function useOperatorQuote(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.operatorQuotes.detail(id),
    queryFn: () => operatorQuotesService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

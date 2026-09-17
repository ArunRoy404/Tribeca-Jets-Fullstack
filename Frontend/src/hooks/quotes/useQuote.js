"use client";

import { useQuery } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One quote. Archived ones load too — the Archived tab links straight here. */
export function useQuote(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.quotes.detail(id),
    queryFn: () => quotesService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The board's tiles, counted by the API from the quotes in the caller's scope. */
export function useQuoteStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.quotes.stats,
    queryFn: () => quotesService.stats(),
    ...queryPresets.standard,
    ...options,
  });
}

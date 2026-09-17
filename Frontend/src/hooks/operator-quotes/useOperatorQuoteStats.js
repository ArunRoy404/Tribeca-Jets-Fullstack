"use client";

import { useQuery } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * The tiles above the sourcing board.
 *
 * `averageResponseHours` arrives null, never 0, when nothing has been answered
 * yet — the screen renders an em dash rather than claiming instant replies.
 */
export function useOperatorQuoteStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.operatorQuotes.stats,
    queryFn: () => operatorQuotesService.stats(),
    ...queryPresets.standard,
    ...options,
  });
}

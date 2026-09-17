"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { operatorQuotesService } from "@/services/operatorQuotes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A page of operator quotes.
 *
 * Scoped server-side through the enquiry: a broker sees quotes on the requests
 * assigned to them plus any unassigned, so the counts always agree with the
 * rows underneath them.
 */
export function useOperatorQuotes(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.operatorQuotes.list(params),
    queryFn: () => operatorQuotesService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

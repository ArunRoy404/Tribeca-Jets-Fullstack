"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A page of quotes. `meta` drives the pager; the API owns the paging. */
export function useQuotes(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.quotes.list(params),
    queryFn: () => quotesService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

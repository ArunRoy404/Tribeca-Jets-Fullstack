"use client";

import { useQuery } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A quote's frozen history, newest first.
 *
 * Append-only on the server, so this is the one query in the module that can
 * never go stale in a way that matters — an existing version never changes.
 */
export function useQuoteVersions(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.quotes.versions(id),
    queryFn: () => quotesService.versions(id),
    enabled: Boolean(id),
    ...queryPresets.static,
    ...options,
  });
}

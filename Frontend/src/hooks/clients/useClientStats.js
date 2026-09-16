"use client";

import { useQuery } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { queryKeys } from "@/lib/queryKeys";

/**
 * The tiles above the table. Scoped server-side, so a broker's tiles count
 * their own book — the numbers always agree with the rows underneath them.
 */
export function useClientStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.clients.stats,
    queryFn: () => clientsService.stats(),
    ...options,
  });
}

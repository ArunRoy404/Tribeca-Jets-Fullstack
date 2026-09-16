"use client";

import { useQuery } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * The Agents roster: the desk's own brokers, with their lead numbers.
 *
 * Lives under the clients hooks because every figure on it is lead data —
 * creating or reassigning a lead moves it, so it shares the clients cache
 * prefix and refreshes when that is invalidated.
 *
 * Not paginated: the desk has a handful of brokers, and the API returns them
 * all in one grouped query rather than one per broker.
 */
export function useBrokerPerformance(options = {}) {
  return useQuery({
    queryKey: queryKeys.clients.brokerPerformance,
    queryFn: clientsService.brokerPerformance,
    ...queryPresets.standard,
    ...options,
  });
}

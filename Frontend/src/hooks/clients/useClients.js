"use client";

import { useQuery } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { queryKeys } from "@/lib/queryKeys";

/**
 * The paginated client directory. `params` comes straight from
 * `useClientsTableParams` and doubles as the query key, so changing a filter
 * changes the key and React Query refetches without any effect wiring.
 */
export function useClients(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () => clientsService.list(params),
    ...options,
  });
}

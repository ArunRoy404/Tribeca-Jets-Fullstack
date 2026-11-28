"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { queryPresets } from "@/config/query.config";
import { queryKeys } from "@/lib/queryKeys";

export function useClientPassengers({ clientId, ...params }, options = {}) {
  return useQuery({
    queryKey: queryKeys.clients.passengers(clientId, params),
    queryFn: () => clientsService.passengers(clientId, params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
    enabled: Boolean(clientId) && options.enabled !== false,
  });
}

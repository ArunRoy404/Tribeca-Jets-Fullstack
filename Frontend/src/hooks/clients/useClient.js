"use client";

import { useQuery } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { queryKeys } from "@/lib/queryKeys";

/** One client. Idle until an id exists, so the detail route can mount first. */
export function useClient(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => clientsService.detail(id),
    enabled: Boolean(id),
    ...options,
  });
}

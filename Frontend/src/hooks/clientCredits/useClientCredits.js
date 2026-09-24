"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { clientCreditsService } from "@/services/clientCredits.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** The ledger itself — one client's movements, newest movement first. */
export function useClientCredits(clientId, params) {
  return useQuery({
    queryKey: queryKeys.clientCredits.list(clientId, params),
    queryFn: () => clientCreditsService.list({ ...params, clientId }),
    enabled: Boolean(clientId),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
  });
}

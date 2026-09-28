"use client";

import { useQuery } from "@tanstack/react-query";
import { clientCreditsService } from "@/services/clientCredits.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * What a client has on account: balance, credited, applied.
 *
 * The balance is computed by the API from the ledger rows and is stored
 * nowhere. That is deliberate and it matters here too — never derive it in the
 * browser from a page of movements, because a page is not the ledger.
 */
export function useCreditSummary(clientId) {
  return useQuery({
    queryKey: queryKeys.clientCredits.summary(clientId),
    queryFn: () => clientCreditsService.summary(clientId),
    enabled: Boolean(clientId),
    ...queryPresets.standard,
  });
}

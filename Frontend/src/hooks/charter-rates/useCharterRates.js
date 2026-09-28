"use client";

import { useQuery } from "@tanstack/react-query";
import { charterRatesService } from "@/services/charterRates.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * The rate table: every aircraft category, including the ones with no rate on
 * file — the screen says "No rate on file" rather than hiding them. Reference
 * data that changes rarely, so the static preset.
 */
export function useCharterRates({ enabled = true } = {}) {
  const params = { page: 1, limit: 20 };
  return useQuery({
    queryKey: queryKeys.charterRates.list(params),
    queryFn: () => charterRatesService.list(params),
    enabled,
    ...queryPresets.static,
  });
}

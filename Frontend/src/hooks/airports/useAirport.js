"use client";

import { useQuery } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One airport, with its audit trail. Idle until an id is selected. */
export function useAirport(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.airports.detail(id),
    queryFn: () => airportsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** One trip. Archived trips load too — the Archived tab links straight here. */
export function useTrip(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.trips.detail(id),
    queryFn: () => tripsService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

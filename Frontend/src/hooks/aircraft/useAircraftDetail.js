"use client";

import { useQuery } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * One aircraft, with its operator, home base, audit trail and trip counts.
 * The Trips tab pages `GET /trips?aircraftId=` itself. Idle until an id is
 * selected.
 *
 * Archived aircraft load here too — the Archived tab links straight to this
 * page, so refusing them would list a row and then 404 it.
 */
export function useAircraftDetail(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.aircraft.detail(id),
    queryFn: () => aircraftService.detail(id),
    enabled: Boolean(id),
    ...queryPresets.standard,
    ...options,
  });
}

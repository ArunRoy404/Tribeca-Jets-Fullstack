"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A page of the fleet.
 *
 * Named `useAircraftList` rather than `useAircraft` because "aircraft" is its
 * own plural: the `useOperators` / `useOperator` pairing has no equivalent
 * here, and two hooks that cannot be told apart by name is worse than breaking
 * the convention once, in the open.
 *
 * Takes the already-parsed params from `useAircraftTableParams`, so the URL is
 * the only place table state lives and the query key follows it automatically.
 */
export function useAircraftList(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.aircraft.list(params),
    queryFn: () => aircraftService.list(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

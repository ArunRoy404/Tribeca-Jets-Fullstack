"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * A page of the airport reference table.
 *
 * Takes the already-parsed params from `useAirportsTableParams`, so the URL is
 * the only place table state lives and the query key follows it automatically.
 */
export function useAirports(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.airports.list(params),
    queryFn: () => airportsService.list(params),
    // Without this the table blanks out on every page change and the layout
    // jumps; with it the previous page stays until the next one lands.
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

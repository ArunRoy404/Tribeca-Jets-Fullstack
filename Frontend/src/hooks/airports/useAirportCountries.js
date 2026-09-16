"use client";

import { useQuery } from "@tanstack/react-query";
import { airportsService } from "@/services/airports.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * Options for the country filter, from the data rather than a hardcoded list.
 *
 * Uses the `static` preset — the one whose description already names airports:
 * this list changes only when an airport is added or removed, so refetching it
 * on every window focus would be noise. `useCreateAirport` and friends
 * invalidate the whole `airports` prefix, so it still updates when it should.
 */
export function useAirportCountries(options = {}) {
  return useQuery({
    queryKey: queryKeys.airports.countries,
    queryFn: airportsService.countries,
    ...queryPresets.static,
    ...options,
  });
}

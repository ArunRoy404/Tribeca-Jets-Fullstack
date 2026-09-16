"use client";

import { useQuery } from "@tanstack/react-query";
import { aircraftService } from "@/services/aircraft.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * Distinct cabin features across the live fleet, for the preference filter.
 *
 * Derived from the stored rows rather than a list fixed at design time, so the
 * dropdown can never offer a feature nothing matches, or omit one somebody
 * typed yesterday.
 */
export function useAircraftAmenities(options = {}) {
  return useQuery({
    queryKey: queryKeys.aircraft.amenities,
    queryFn: aircraftService.amenities,
    ...queryPresets.standard,
    ...options,
  });
}

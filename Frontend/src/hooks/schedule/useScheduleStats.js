"use client";

import { useQuery } from "@tanstack/react-query";
import { scheduleService } from "@/services/schedule.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * The tiles, counted by the API under the calendar's filters. `on` is the
 * browser's own today, so a desk at 9pm in New York is not counted into
 * tomorrow by a server running on UTC.
 */
export function useScheduleStats(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.schedule.stats(params),
    queryFn: () => scheduleService.stats(params),
    ...queryPresets.standard,
    ...options,
  });
}

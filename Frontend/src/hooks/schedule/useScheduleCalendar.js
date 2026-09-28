"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { scheduleService } from "@/services/schedule.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/** A year of legs counted per month and per day, for the year overview. */
export function useScheduleCalendar(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.schedule.calendar(params),
    queryFn: () => scheduleService.calendar(params),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
    ...options,
  });
}

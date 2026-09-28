"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { scheduleService } from "@/services/schedule.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";
import { SCHEDULE_PAGE_LIMIT, scheduleWindow, toScheduleEvent } from "@/lib/schedule";
import { toISODate } from "@/lib/date";
import { useScheduleParams } from "./useScheduleParams";

/**
 * The legs in the window the calendar is showing, mapped for the screen.
 *
 * Every schedule component calls this rather than being handed the list, and
 * React Query shares the one request between them by its key. `truncated` is
 * true when the window holds more legs than one request returns — the panel
 * says so rather than showing a calendar that looks complete and is not.
 */
export function useScheduleEvents() {
  const params = useScheduleParams();
  const range = scheduleWindow(params.view, params.currentDate);
  const requestParams = range ? { ...range, limit: SCHEDULE_PAGE_LIMIT, ...params.filterParams } : null;

  const query = useQuery({
    queryKey: queryKeys.schedule.list(requestParams),
    queryFn: () => scheduleService.list(requestParams),
    enabled: Boolean(requestParams),
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
  });

  const events = useMemo(() => (query.data?.data ?? []).map(toScheduleEvent), [query.data?.data]);
  const byDay = useMemo(() => {
    const map = new Map();
    for (const event of events) {
      if (!event?.date) continue;
      if (!map.has(event.date)) map.set(event.date, []);
      map.get(event.date).push(event);
    }
    return map;
  }, [events]);

  const total = query.data?.meta?.total ?? 0;
  return {
    ...query,
    events,
    /** A day's legs, in the order the API sent them — the order they fly. */
    eventsFor: (date) => byDay.get(toISODate(date)) ?? [],
    eventById: (id) => events.find((event) => event?.id === id) ?? null,
    total,
    truncated: total > events.length,
  };
}

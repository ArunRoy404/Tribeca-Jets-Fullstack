"use client";

import { useMemo } from "react";
import {
  dateField,
  enumParam,
  filterField,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { addDays, addMonths, parseLocalDate, toISODate } from "@/lib/date";
import { TRIP_STATUSES, TRIP_TYPES } from "@/lib/trip";
import { SCHEDULE_VIEWS } from "@/lib/schedule";

const idField = () => ({ default: "", parse: stringParam(36), resetsPage: true });

/**
 * Everything the calendar is showing lives in the URL — the view, the day and
 * the filters — so a pasted link opens the same week with the same filters.
 * `view` and `date` are `local`: they decide the window, not a filter.
 */
const SCHEMA = {
  view: { default: "day", parse: enumParam(SCHEDULE_VIEWS), local: true },
  /** The day in view; empty means today, so a bookmarked calendar opens on today. */
  date: { ...dateField(), local: true },
  search: searchField(),
  status: filterField(TRIP_STATUSES),
  type: filterField(TRIP_TYPES),
  assignedBrokerId: idField(),
  operatorId: idField(),
  aircraftId: idField(),
};

const FILTER_KEYS = ["search", "status", "type", "assignedBrokerId", "operatorId", "aircraftId"];

/** Today at local midnight — the browser's own day, not the server's. */
function localToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** URL state for the Schedule calendar, with the navigation the toolbar needs. */
export function useScheduleParams() {
  const { values, setValues, queryParams } = useTableQueryParams(SCHEMA);
  const today = localToday();
  const currentDate = useMemo(
    () => (values.date ? parseLocalDate(values.date) : localToday()),
    [values.date],
  );

  /** Today is the default, so it is left out of the URL rather than written in. */
  const dateValue = (date) => (toISODate(date) === toISODate(today) ? "" : toISODate(date));
  const goToDate = (date) => setValues({ date: dateValue(date) });
  const step = (direction) => {
    if (values.view === "month") return goToDate(addMonths(currentDate, direction));
    if (values.view === "year") return goToDate(addMonths(currentDate, 12 * direction));
    return goToDate(addDays(currentDate, values.view === "week" ? 7 * direction : direction));
  };

  return {
    ...values,
    /** The filters alone, for the list, the tiles and the year counts alike. */
    filterParams: queryParams,
    currentDate,
    today,
    setView: (view) => setValues({ view }),
    setSearch: (search) => setValues({ search }),
    setStatus: (status) => setValues({ status }),
    setType: (type) => setValues({ type }),
    setAssignedBrokerId: (assignedBrokerId) => setValues({ assignedBrokerId }),
    setOperatorId: (operatorId) => setValues({ operatorId }),
    setAircraftId: (aircraftId) => setValues({ aircraftId }),
    goToDate,
    /** Switch view and day in one URL write — from the year overview's cells. */
    showDate: (view, date) => setValues({ view, date: dateValue(date) }),
    goToday: () => setValues({ date: "" }),
    goPrev: () => step(-1),
    goNext: () => step(1),
    hasFilters: FILTER_KEYS.some((key) => Boolean(values[key])),
    /** Clears the filters and keeps the view and the day. */
    clearFilters: () => setValues(Object.fromEntries(FILTER_KEYS.map((key) => [key, ""]))),
  };
}

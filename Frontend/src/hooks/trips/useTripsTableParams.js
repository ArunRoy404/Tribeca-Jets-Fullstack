"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { TRIP_STATUSES } from "@/lib/trip";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `TRIP_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "reference", "departureDate", "status"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(TRIP_STATUSES),
  departure: filterField(["PAST", "TODAY", "UPCOMING"]),
  assignedBrokerId: { default: "", parse: stringParam(36), resetsPage: true },
};

/** URL state for the Trips board. */
export function useTripsTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    tab: values.archived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE,
    setTab: (tab) => setters.setArchived(tab === ARCHIVE_TABS.ARCHIVED),
    hasFilters: Boolean(values.search || values.status || values.departure || values.assignedBrokerId),
    clearFilters: reset,
  };
}

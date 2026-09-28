"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { ITINERARY_STATUSES } from "@/lib/itinerary";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `ITINERARY_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "status", "confirmedAt", "departureDate"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(ITINERARY_STATUSES),
  /** The document whose detail sheet is open — in the URL so a reload or a
   * link from the trips board keeps it open; `local` so it never refetches
   * the board. */
  itinerary: { default: "", parse: stringParam(36), local: true },
};

/** URL state for the Itineraries board. */
export function useItinerariesTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    tab: values.archived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE,
    setTab: (tab) => setters.setArchived(tab === ARCHIVE_TABS.ARCHIVED),
    hasFilters: Boolean(values.search || values.status),
    clearFilters: reset,
  };
}

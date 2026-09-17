"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { FILTERABLE_AIRCRAFT_CATEGORIES } from "@/lib/aircraft";
import { ARCHIVE_TABS } from "@/lib/archive";

/**
 * URL state for the Operator Sourcing board.
 *
 * It lives with trip-requests rather than operator-quotes because **the board
 * lists trip requests**: the rows are enquiries being worked, and the quotes
 * hang underneath each one. The screen's own status vocabulary — Requested,
 * Pending Operator Quote, Sourcing, Source Complete — is derived from the
 * quotes on every read, so it is not a filter the API accepts; the board filters
 * on the enquiry's real status instead.
 */

/** Mirrors `TRIP_REQUEST_SORTABLE_FIELDS` on the API. */
const SORTABLE = [
  "createdAt",
  "updatedAt",
  "departureDate",
  "quoteDeadline",
  "status",
  "estimatedValue",
  "passengers",
];

/** The pipeline statuses a request being sourced can be in. */
const SOURCING_STATUSES = ["OPEN", "SOURCING", "QUOTED", "CONVERTED", "LOST"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(SOURCING_STATUSES),
  aircraftPreference: filterField(FILTERABLE_AIRCRAFT_CATEGORIES),
  // A broker id rather than a fixed vocabulary, so it cannot use
  // `filterField`. The API rejects anything that is not a UUID.
  assignedBrokerId: { default: "", parse: stringParam(36), resetsPage: true },
};

export function useSourcingTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } =
    useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    tab: values.archived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE,
    setTab: (tab) => setters.setArchived(tab === ARCHIVE_TABS.ARCHIVED),
    hasFilters: Boolean(
      values.search ||
        values.status ||
        values.aircraftPreference ||
        values.assignedBrokerId,
    ),
    clearFilters: reset,
  };
}

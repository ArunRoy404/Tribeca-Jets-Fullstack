"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { FILTERABLE_AIRCRAFT_CATEGORIES } from "@/lib/aircraft";
import { LEAD_SOURCES, REQUEST_STATUSES } from "@/lib/lead";
import { ARCHIVE_TABS } from "@/lib/archive";

/**
 * URL state for the Trip Requests page.
 *
 * Separate from `useSourcingTableParams` even though both list trip requests:
 * the sourcing board is a working queue filtered by how far an enquiry has got
 * with operators, and this is the whole enquiry log — "we get a lot of trip
 * requests, most never get booked, we still want the data". They filter on
 * different things and open on different halves of the table, so one schema
 * would have to default two ways at once.
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

/** Departure relative to today, as the API's `departure` param names them. */
export const REQUEST_WINDOWS = ["OVERDUE", "TODAY", "UPCOMING"];

/**
 * The three halves of the log, as one URL field.
 *
 * `active` is the default because the client asked for an "active trip
 * request" section: a desk opening this page wants the enquiries still in
 * play, not the two years of history behind them. `all` and `archived` are a
 * click away, and nothing is ever hidden permanently.
 */
export const REQUEST_TABS = { ACTIVE: "active", ALL: "all", ARCHIVED: "archived" };
const TAB_VALUES = Object.values(REQUEST_TABS);

const SCHEMA = {
  /**
   * One field, not two.
   *
   * `openOnly` and `archived` are separate query params on the API, but on
   * screen they are one choice — a request cannot be both the live working
   * list and the archive. Two fields would let the URL express a state the tab
   * strip cannot show, and the two would disagree about which is selected.
   */
  tab: {
    default: REQUEST_TABS.ACTIVE,
    parse: (raw) => (TAB_VALUES.includes(raw) ? raw : undefined),
    serialise: (value) => (value === REQUEST_TABS.ACTIVE ? "" : value),
    resetsPage: true,
    // Never sent to the API: it is unpacked into `openOnly` and `archived`
    // below. Left un-`local` it would also become part of the query key and
    // refetch the table on a tab change that changes nothing.
    local: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(REQUEST_STATUSES),
  source: filterField(LEAD_SOURCES),
  aircraftPreference: filterField(FILTERABLE_AIRCRAFT_CATEGORIES),
  departure: filterField(REQUEST_WINDOWS),
  // Ids rather than a fixed vocabulary, so they cannot use `filterField`.
  // The API rejects anything that is not a UUID.
  clientId: { default: "", parse: stringParam(36), resetsPage: true },
  assignedBrokerId: { default: "", parse: stringParam(36), resetsPage: true },
};

export function useTripRequestTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } =
    useTableQueryParams(SCHEMA);

  const isArchived = values.tab === REQUEST_TABS.ARCHIVED;

  return {
    ...values,
    ...setters,
    goToPage,
    setValues,

    // The two API params the tab actually means. Sent explicitly rather than
    // relying on their defaults, so reading this hook tells you what the
    // request will contain.
    queryParams: {
      ...queryParams,
      openOnly: values.tab === REQUEST_TABS.ACTIVE,
      archived: isArchived,
    },

    isArchived,
    // The archive tab's shared components speak `ARCHIVE_TABS`, so the answer
    // they need is derived here rather than each of them re-deriving it.
    archiveTab: isArchived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE,

    hasFilters: Boolean(
      values.search ||
        values.status ||
        values.source ||
        values.aircraftPreference ||
        values.departure ||
        values.clientId ||
        values.assignedBrokerId,
    ),
    clearFilters: reset,
  };
}

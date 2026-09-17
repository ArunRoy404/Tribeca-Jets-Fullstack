"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { QUOTE_STATUSES } from "@/lib/quote";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `QUOTE_SORTABLE_FIELDS` on the API exactly — a value the API would
 *  reject with a 400 must not survive the URL either. */
const SORTABLE = [
  "createdAt",
  "updatedAt",
  "reference",
  "basePrice",
  "status",
  "departureDate",
  "validUntil",
  "sentAt",
];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(QUOTE_STATUSES),
  // Ids rather than a fixed vocabulary, so they cannot use `filterField`.
  // The API rejects anything that is not a UUID.
  clientId: { default: "", parse: stringParam(36), resetsPage: true },
  assignedBrokerId: { default: "", parse: stringParam(36), resetsPage: true },
  tripRequestId: { default: "", parse: stringParam(36), resetsPage: true },
};

/** URL state for the Quotes board. */
export function useQuotesTableParams() {
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
        values.clientId ||
        values.assignedBrokerId ||
        values.tripRequestId,
    ),
    clearFilters: reset,
  };
}

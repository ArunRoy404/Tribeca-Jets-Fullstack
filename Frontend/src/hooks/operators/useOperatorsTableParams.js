"use client";

import {
  filterField,
  paginationFields,
  searchField,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { FILTERABLE_OPERATOR_STATUSES } from "@/lib/operator";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `OPERATOR_SORTABLE_FIELDS` on the API. */
const SORTABLE = [
  "createdAt",
  "updatedAt",
  "name",
  "status",
  "reliabilityRating",
];

/**
 * The URL schema for the Operators screen. Only the module-specific parts are
 * declared; paging, sorting and search come from the shared builders.
 */
const SCHEMA = {
  // `archived` is what the API takes and what goes in the URL — the tab is not
  // separate state that could disagree with the query.
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(FILTERABLE_OPERATOR_STATUSES),
};

export function useOperatorsTableParams() {
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
    hasFilters: Boolean(values.search || values.status),
    clearFilters: reset,
  };
}

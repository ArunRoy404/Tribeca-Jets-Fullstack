"use client";

import {
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `AIRPORT_SORTABLE_FIELDS` on the API. A value it rejects is rejected here. */
const SORTABLE = [
  "createdAt",
  "updatedAt",
  "icao",
  "iata",
  "name",
  "city",
  "country",
  "longestRunwayFt",
];

/**
 * The URL schema for the Airports screen.
 *
 * Only the module-specific parts are declared; paging, sorting and search come
 * from the shared builders. Defined outside the hook so its identity is stable.
 *
 * `country` is a free string rather than `filterField`, because the allowed
 * values are the distinct countries in the database — which the client cannot
 * know at module scope. The API rejects a country nothing matches by simply
 * returning an empty page, which is the honest answer for `?country=Narnia`.
 */
const SCHEMA = {
  // `archived` is what the API takes, and it is what goes in the URL — the tab
  // is not a separate piece of state that could disagree with the query.
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  country: { default: "", parse: stringParam(100), resetsPage: true },
};

export function useAirportsTableParams() {
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
    hasFilters: Boolean(values.search || values.country),
    clearFilters: reset,
  };
}

"use client";

import {
  filterField,
  paginationFields,
  searchField,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  FILTERABLE_AIRCRAFT_STATUSES,
} from "@/lib/aircraft";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `AIRCRAFT_SORTABLE_FIELDS` on the API. */
const SORTABLE = [
  "createdAt",
  "updatedAt",
  "tailNumber",
  "model",
  "category",
  "status",
  "maxPassengers",
  "rangeNm",
  "yearBuilt",
];

/**
 * The URL schema for the Aircraft screen. Only the module-specific parts are
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
  status: filterField(FILTERABLE_AIRCRAFT_STATUSES),
  category: filterField(FILTERABLE_AIRCRAFT_CATEGORIES),

  /**
   * The fleet finder (scope §6.8): passenger-capacity and cabin-preference
   * filtering. In the URL like every other filter, so "9 seats, transatlantic,
   * with a galley" is a link a broker can send someone.
   *
   * Parsed rather than passed through: these reach the API as numbers, and a
   * hand-edited `?minPassengers=abc` must degrade to no filter rather than
   * 400 the table.
   */
  minPassengers: {
    default: "",
    parse: (raw) => {
      const value = Number.parseInt(raw, 10);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    },
    serialise: (value) => (value ? String(value) : ""),
    resetsPage: true,
  },
  minRangeNm: {
    default: "",
    parse: (raw) => {
      const value = Number.parseInt(raw, 10);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    },
    serialise: (value) => (value ? String(value) : ""),
    resetsPage: true,
  },
  /** Comma separated on the wire; the API requires an aircraft to have all. */
  amenities: searchField(),
};

export function useAircraftTableParams() {
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
        values.category ||
        values.minPassengers ||
        values.minRangeNm ||
        values.amenities,
    ),
    clearFilters: reset,
  };
}

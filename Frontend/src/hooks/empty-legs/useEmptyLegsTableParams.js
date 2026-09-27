"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { EMPTY_LEG_STATUSES } from "@/lib/emptyLeg";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `EMPTY_LEG_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "reference", "departureDate", "expiresAt", "price"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(EMPTY_LEG_STATUSES),
  /**
   * The leg whose detail sheet is open. In the URL so the dashboard's
   * "View matches" can link straight to it, and a reload keeps it open;
   * `local` so opening a sheet never refetches the board.
   */
  leg: { default: "", parse: stringParam(36), local: true },
};

/** URL state for the Empty Legs board. */
export function useEmptyLegsTableParams() {
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

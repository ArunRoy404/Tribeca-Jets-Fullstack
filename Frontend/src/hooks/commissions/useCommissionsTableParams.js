"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { COMMISSION_STATUSES, RECIPIENT_TYPES } from "@/lib/commission";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `COMMISSION_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "reference", "paidAt", "status"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(COMMISSION_STATUSES),
  recipientType: filterField(RECIPIENT_TYPES),
  /** The commission whose sheet is open — view state, never sent to the API. */
  commission: { default: "", parse: stringParam(36), local: true },
};

/** URL state for the Commissions board. */
export function useCommissionsTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    tab: values.archived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE,
    setTab: (tab) => setters.setArchived(tab === ARCHIVE_TABS.ARCHIVED),
    hasFilters: Boolean(values.search || values.status || values.recipientType),
    clearFilters: reset,
  };
}

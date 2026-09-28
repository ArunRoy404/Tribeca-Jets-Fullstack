"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { INVOICE_STATES } from "@/lib/receivable";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `INVOICE_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "reference", "dueDate", "issuedAt", "status"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  state: filterField(INVOICE_STATES),
  /** The invoice whose sheet is open — view state, never sent to the API. */
  invoice: { default: "", parse: stringParam(36), local: true },
};

/** URL state for the Receivables board. */
export function useReceivablesTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    tab: values.archived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE,
    setTab: (tab) => setters.setArchived(tab === ARCHIVE_TABS.ARCHIVED),
    hasFilters: Boolean(values.search || values.state),
    clearFilters: reset,
  };
}

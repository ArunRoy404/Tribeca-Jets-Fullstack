"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { PAYABLE_STATES } from "@/lib/operatorPayment";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `PAYABLE_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "reference", "dueDate", "status"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  state: filterField(PAYABLE_STATES),
  /** The bill whose sheet is open — view state, never sent to the API. */
  bill: { default: "", parse: stringParam(36), local: true },
};

/** URL state for the Operator Payments board. */
export function useOperatorPaymentsTableParams() {
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

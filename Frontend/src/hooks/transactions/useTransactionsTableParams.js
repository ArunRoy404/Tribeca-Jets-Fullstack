"use client";

import {
  dateField,
  enumParam,
  filterField,
  paginationFields,
  searchField,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { MOVEMENT_KINDS } from "@/lib/transaction";

/**
 * URL state for the ledger. It sorts by one thing — the day the money moved —
 * so `sortBy` is fixed at `date` (the API's only value) and the order is the
 * only choice. There is no Archived tab: a withdrawn payment is not money
 * that moved, and lives on its bill's sheet.
 */
const SCHEMA = {
  ...paginationFields(["date"], { sortBy: "date" }),
  search: searchField(),
  kind: filterField(MOVEMENT_KINDS),
  direction: { default: "", parse: enumParam(["IN", "OUT"]), resetsPage: true },
  from: dateField(),
  to: dateField(),
};

export function useTransactionsTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  // The same filters narrow the totals, so the tiles describe the rows below them.
  const statsParams = {
    ...(values.search ? { search: values.search } : {}),
    ...(values.kind ? { kind: values.kind } : {}),
    ...(values.direction ? { direction: values.direction } : {}),
    ...(values.from ? { from: values.from } : {}),
    ...(values.to ? { to: values.to } : {}),
  };

  return {
    ...values,
    ...setters,
    queryParams,
    statsParams,
    goToPage,
    setValues,
    hasFilters: Boolean(values.search || values.kind || values.direction || values.from || values.to),
    clearFilters: reset,
  };
}

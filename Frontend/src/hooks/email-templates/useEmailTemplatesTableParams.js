"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { EMAIL_STATUSES, EMAIL_TABS, EMAIL_TEMPLATE_CATEGORIES, TEMPLATE_ACTIVITY } from "@/lib/email";

/** Mirrors `EMAIL_TEMPLATE_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "name", "category"];

const flag = {
  default: false,
  parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
  serialise: (value) => (value ? "true" : ""),
  resetsPage: true,
};

const SCHEMA = {
  archived: flag,
  /** The sent log — view-only, so it never reaches the template query. */
  sent: { ...flag, local: true },
  ...paginationFields(SORTABLE),
  search: searchField(),
  category: filterField(EMAIL_TEMPLATE_CATEGORIES),
  active: filterField(TEMPLATE_ACTIVITY),
  /** The sent log's own filter; `local` so it never reaches the template query. */
  status: { ...filterField(EMAIL_STATUSES), local: true },
  /** The template whose sheet is open, and the sent email whose sheet is open. */
  template: { default: "", parse: stringParam(36), local: true },
  email: { default: "", parse: stringParam(36), local: true },
};

/**
 * URL state for the Email Templates screen. Three tabs from two flags: the
 * library, the sent log, and the archived library. `archived` is what the
 * template query takes; `sent` swaps the table for the log.
 */
export function useEmailTemplatesTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  const tab = values.sent ? EMAIL_TABS.SENT : values.archived ? EMAIL_TABS.ARCHIVED : EMAIL_TABS.LIVE;

  return {
    ...values,
    ...setters,
    queryParams,
    /** The sent log's query: the same page, size and search, and its own status filter. */
    sentParams: {
      page: values.page,
      limit: values.limit,
      ...(values.search ? { search: values.search } : {}),
      ...(values.status ? { status: values.status } : {}),
    },
    goToPage,
    setValues,
    tab,
    setTab: (next) =>
      setValues({ sent: next === EMAIL_TABS.SENT, archived: next === EMAIL_TABS.ARCHIVED, status: "", category: "", active: "" }),
    hasFilters: Boolean(values.search || values.category || values.active || values.status),
    clearFilters: reset,
  };
}

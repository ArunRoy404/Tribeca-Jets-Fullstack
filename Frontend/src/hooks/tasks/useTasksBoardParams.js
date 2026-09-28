"use client";

import { searchField, stringParam, filterField, useTableQueryParams } from "@/hooks/common/useTableQueryParams";
import { TASK_VIEWS } from "@/lib/task";
import { toISODate } from "@/lib/date";

/**
 * URL state for the board: the search, the quick view and the open task. The
 * board has no pager — each column asks for its own first page — so there is
 * no page or sort here.
 */
const SCHEMA = {
  search: searchField(),
  view: { ...filterField(TASK_VIEWS), default: "ALL", local: true },
  /** The task whose panel is open — in the URL so the bell and a pasted link open it. */
  task: { default: "", parse: stringParam(36), local: true },
};

export function useTasksBoardParams() {
  const { values, setValues, queryParams, setters } = useTableQueryParams(SCHEMA);
  const archived = values.view === "ARCHIVED";

  // The view becomes the API's own parameters; "Everyone" and "Archived" are
  // not API views. `on` is the browser's day, so "due today" is the desk's today.
  const apiView = values.view === "ALL" || archived ? {} : { view: values.view };
  const filterParams = { ...queryParams, ...apiView, ...(archived ? { archived: true } : {}), on: toISODate(new Date()) };

  return {
    ...values,
    ...setters,
    archived,
    filterParams,
    setValues,
    hasFilters: Boolean(values.search) || values.view !== "ALL",
  };
}

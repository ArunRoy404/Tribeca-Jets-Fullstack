"use client";

import {
  filterField,
  paginationFields,
  searchField,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
} from "@/lib/lead";

/**
 * Mirrors `CLIENT_SORTABLE_FIELDS` on the API — leads are clients, so the
 * Leads table sorts by the same allowlist the client table does.
 */
const SORTABLE = [
  "createdAt",
  "updatedAt",
  "lastName",
  "nextFollowUpAt",
];

/**
 * The URL schema for the Leads tab.
 *
 * There is no `status` field here and that is deliberate: the tab *is*
 * `status=LEAD`, applied by the container rather than exposed as a filter
 * somebody could set to something else. What the screen calls "Status" is the
 * funnel — `leadStage`.
 */
const SCHEMA = {
  ...paginationFields(SORTABLE),
  search: searchField(),
  leadStage: filterField(LEAD_STAGES),
  leadSource: filterField(LEAD_SOURCES),
  priority: filterField(LEAD_PRIORITIES),
  /** A uuid, not an enum, so it is validated as a plain bounded string. */
  assignedBrokerId: searchField(64),
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
};

export function useLeadsTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } =
    useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    hasFilters: Boolean(
      values.search ||
        values.leadStage ||
        values.leadSource ||
        values.priority ||
        values.assignedBrokerId,
    ),
    clearFilters: reset,
  };
}

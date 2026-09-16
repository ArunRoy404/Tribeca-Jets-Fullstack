"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import {
  FILTERABLE_CLIENT_STATUSES,
  FILTERABLE_CLIENT_TYPES,
  FOLLOW_UP_WINDOWS,
} from "@/lib/client";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `CLIENT_SORTABLE_FIELDS` on the API. A value it rejects is rejected here. */
const SORTABLE = [
  "createdAt",
  "updatedAt",
  "lastName",
  "firstName",
  "leadStage",
  "status",
  "nextFollowUpAt",
];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(FILTERABLE_CLIENT_STATUSES),
  type: filterField(FILTERABLE_CLIENT_TYPES),
  followUp: filterField(FOLLOW_UP_WINDOWS),
  // A broker id rather than a fixed vocabulary, so it cannot use
  // `filterField`. The API rejects anything that is not a UUID, and an
  // unknown-but-valid id simply matches no rows.
  assignedBrokerId: { default: "", parse: stringParam(36), resetsPage: true },
};

export function useClientsTableParams() {
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
        values.type ||
        values.followUp ||
        values.assignedBrokerId,
    ),
    clearFilters: reset,
  };
}

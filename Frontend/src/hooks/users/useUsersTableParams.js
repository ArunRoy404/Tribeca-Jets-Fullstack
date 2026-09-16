"use client";

import {
  enumParam,
  filterField,
  paginationFields,
  searchField,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { FILTERABLE_ROLES, FILTERABLE_STATUSES } from "@/lib/user";

/** Tab ids. Kept short because they appear in the URL. */
export const USERS_TABS = {
  MEMBERS: "members",
  ROLES: "roles",
};

const TAB_VALUES = Object.values(USERS_TABS);

/** Mirrors `USER_SORTABLE_FIELDS` on the API. A value it rejects is rejected here. */
const SORTABLE = [
  "createdAt",
  "updatedAt",
  "firstName",
  "lastName",
  "email",
  "role",
  "status",
  "lastLoginAt",
];

/**
 * The URL schema for the Users & Roles screen.
 *
 * Every value round-trips through the query string, so a link reproduces the
 * exact view — tab, page, page size, filters and all — and back steps through
 * it.
 *
 * Only the module-specific parts are declared here; paging, sorting and search
 * come from the shared builders, so this is the whole difference between this
 * table and the next one.
 *
 * Defined once, outside the hook, so its identity is stable and does not
 * re-trigger the memos on every render.
 */
const SCHEMA = {
  tab: {
    default: USERS_TABS.MEMBERS,
    parse: enumParam(TAB_VALUES),
    // Switching tabs abandons the table's paging entirely, so it resets the
    // page like any other view change.
    resetsPage: true,
    // View state, not a query: the roles tab must not refetch the table.
    local: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  role: filterField(FILTERABLE_ROLES),
  status: filterField(FILTERABLE_STATUSES),
};

export function useUsersTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } =
    useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    hasFilters: Boolean(values.search || values.role || values.status),
    clearFilters: reset,
  };
}

"use client";

import { useCallback, useMemo } from "react";
import {
  enumParam,
  intParam,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { FILTERABLE_ROLES, FILTERABLE_STATUSES } from "@/lib/user";

/** Tab ids. Kept short because they appear in the URL. */
export const USERS_TABS = { MEMBERS: "members", ROLES: "roles" };

const TAB_VALUES = Object.values(USERS_TABS);

/**
 * The URL schema for the Users & Roles screen.
 *
 * Every value here round-trips through the query string, so a link reproduces
 * the exact view — tab, page, filters and all — and the browser's back button
 * steps through it.
 *
 * Defined once, outside the hook, so its identity is stable and does not
 * re-trigger the memo on every render.
 */
const SCHEMA = {
  tab: {
    default: USERS_TABS.MEMBERS,
    parse: enumParam(TAB_VALUES),
    // Switching tabs abandons the table's paging entirely, so it resets the
    // page like any other view change.
    resetsPage: true,
  },
  page: {
    default: 1,
    // Clamped rather than passed through: `?page=-5` must show page 1, not
    // produce a 400 from the API.
    parse: intParam(1, 10_000),
  },
  limit: {
    default: 10,
    // 100 is the API's hard cap; asking for more is refused there.
    parse: intParam(1, 100),
    resetsPage: true,
  },
  search: {
    default: "",
    parse: stringParam(200),
    resetsPage: true,
  },
  role: {
    default: "",
    // Case-sensitive against the wire vocabulary: `?role=broker` is a bug
    // worth falling back to "all roles" rather than silently correcting.
    parse: enumParam(FILTERABLE_ROLES),
    resetsPage: true,
  },
  status: {
    default: "",
    parse: enumParam(FILTERABLE_STATUSES),
    resetsPage: true,
  },
  sortBy: {
    default: "createdAt",
    parse: enumParam([
      "createdAt",
      "updatedAt",
      "firstName",
      "lastName",
      "email",
      "role",
      "status",
      "lastLoginAt",
    ]),
    resetsPage: true,
  },
  sortOrder: {
    default: "desc",
    parse: enumParam(["asc", "desc"]),
    resetsPage: true,
  },
};

export function useUsersTableParams() {
  const { values, setValues, reset } = useTableQueryParams(SCHEMA);

  /**
   * What actually goes to the API.
   *
   * Empty filters are dropped rather than sent as `""`, which the API would
   * reject as an invalid enum. This is also the query key, so it must contain
   * only the fields that affect the response — putting `tab` in here would
   * refetch the table every time someone looked at the roles tab.
   */
  const queryParams = useMemo(() => {
    const params = {
      page: values.page,
      limit: values.limit,
      sortBy: values.sortBy,
      sortOrder: values.sortOrder,
    };
    if (values.search) params.search = values.search;
    if (values.role) params.role = values.role;
    if (values.status) params.status = values.status;
    return params;
  }, [values.page, values.limit, values.sortBy, values.sortOrder, values.search, values.role, values.status]);

  const setTab = useCallback((tab) => setValues({ tab }), [setValues]);
  const setPage = useCallback((page) => setValues({ page }), [setValues]);
  const setSearch = useCallback((search) => setValues({ search }), [setValues]);
  const setRole = useCallback((role) => setValues({ role }), [setValues]);
  const setStatus = useCallback((status) => setValues({ status }), [setValues]);

  const hasFilters = Boolean(values.search || values.role || values.status);

  return {
    ...values,
    queryParams,
    setTab,
    setPage,
    setSearch,
    setRole,
    setStatus,
    setValues,
    hasFilters,
    clearFilters: reset,
  };
}

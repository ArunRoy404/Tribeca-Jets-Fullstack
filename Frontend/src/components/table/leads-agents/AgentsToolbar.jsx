"use client";

import { useMemo, useState } from "react";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { FILTERABLE_ROLES, formatUserRole } from "@/lib/user";

const ALL_ROLES = "All Roles";

/**
 * Filters for the Agents roster.
 *
 * Client-side, unlike every other table in this project, and deliberately so:
 * the roster is one unpaginated response of a handful of brokers, computed in
 * three grouped queries. Pushing search and role into the URL and back to the
 * API would mean re-running those aggregates on every keystroke to filter a
 * list that fits on one screen.
 *
 * There is no Add Agent button. Staff are invited through Users & Roles, where
 * the permission matrix and the suspend rules live — a second create form for
 * the same record would drift from the first.
 */
export default function AgentsToolbar({ search, setSearch, roleFilter, setRoleFilter }) {
  const options = useMemo(
    () => [ALL_ROLES, ...FILTERABLE_ROLES.map(formatUserRole)],
    [],
  );
  const valueByLabel = useMemo(
    () => Object.fromEntries(FILTERABLE_ROLES.map((r) => [formatUserRole(r), r])),
    [],
  );

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search agents..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label={ALL_ROLES}
          value={roleFilter ? formatUserRole(roleFilter) : ALL_ROLES}
          options={options}
          onChange={(label) => setRoleFilter?.(valueByLabel[label] ?? "")}
        />
      </div>
      <p className="font-montserrat text-[12px] text-muted-foreground">
        Staff are added in Users &amp; Roles.
      </p>
    </div>
  );
}

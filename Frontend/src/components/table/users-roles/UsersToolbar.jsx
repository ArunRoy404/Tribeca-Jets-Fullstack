"use client";

import { useCallback, useMemo } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { USERS_TABS } from "@/hooks/users";
import {
  FILTERABLE_ROLES,
  FILTERABLE_STATUSES,
  formatUserRole,
  formatUserStatus,
} from "@/lib/user";

const TAB_LABELS = {
  [USERS_TABS.MEMBERS]: "Team Members",
  [USERS_TABS.ROLES]: "Roles & Permissions",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);

const ALL_ROLES = "All Roles";
const ALL_STATUS = "All Status";

/**
 * The dropdowns show words; the URL and the API carry enum constants. The
 * translation happens here at the edge so nothing downstream has to know
 * about display labels — and so `SENIOR_BROKER` never leaks into the UI or
 * `"Senior Broker"` into a request.
 */
export default function UsersToolbar({
  activeTab,
  setActiveTab,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  onInviteUser,
}) {
  const isRolesTab = activeTab === USERS_TABS.ROLES;

  // The field stays instant while the URL catches up, so typing does not put
  // one history entry and one request per keystroke.
  const commitSearch = useCallback((value) => setSearch?.(value), [setSearch]);
  const [draft, setDraft] = useDebouncedParam(search, commitSearch);

  const roleOptions = useMemo(
    () => [ALL_ROLES, ...FILTERABLE_ROLES.map(formatUserRole)],
    [],
  );
  const statusOptions = useMemo(
    () => [ALL_STATUS, ...FILTERABLE_STATUSES.map(formatUserStatus)],
    [],
  );

  const roleLabelToValue = useMemo(
    () => Object.fromEntries(FILTERABLE_ROLES.map((r) => [formatUserRole(r), r])),
    [],
  );
  const statusLabelToValue = useMemo(
    () => Object.fromEntries(FILTERABLE_STATUSES.map((s) => [formatUserStatus(s), s])),
    [],
  );

  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <FilterTabs
          options={Object.values(TAB_LABELS)}
          value={TAB_LABELS[activeTab] ?? TAB_LABELS[USERS_TABS.MEMBERS]}
          onValueChange={(label) => setActiveTab?.(TAB_IDS[label] ?? USERS_TABS.MEMBERS)}
        />
        {!isRolesTab && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onInviteUser?.()}
            className="px-3 sm:px-4 gap-2"
          >
            <UserPlus className="size-3.5" />
            <span>Invite User</span>
          </Button>
        )}
      </div>

      {!isRolesTab && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <SearchInput
            size="sm"
            placeholder="Search team members..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_ROLES}
            value={roleFilter ? formatUserRole(roleFilter) : ALL_ROLES}
            options={roleOptions}
            onChange={(label) => setRoleFilter?.(roleLabelToValue[label] ?? "")}
          />
          <FilterDropdown
            label={ALL_STATUS}
            value={statusFilter ? formatUserStatus(statusFilter) : ALL_STATUS}
            options={statusOptions}
            onChange={(label) => setStatusFilter?.(statusLabelToValue[label] ?? "")}
          />
        </div>
      )}
    </div>
  );
}

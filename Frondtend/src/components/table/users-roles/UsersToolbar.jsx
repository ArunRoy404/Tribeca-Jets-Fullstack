"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import { userRoleOptions, userStatusOptions } from "@/dummyData/usersRoles";

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
  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <FilterTabs
          options={["Team Members", "Roles & Permissions"]}
          value={activeTab === "roles" ? "Roles & Permissions" : "Team Members"}
          onValueChange={(val) => setActiveTab?.(val === "Roles & Permissions" ? "roles" : "users")}
        />
        {activeTab !== "roles" && (
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

      {activeTab !== "roles" && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <SearchInput
            size="sm"
            placeholder="Search team members..."
            value={search ?? ""}
            onChange={(e) => setSearch?.(e.target.value)}
          />
          <FilterDropdown
            label="All Roles"
            value={roleFilter}
            options={userRoleOptions}
            onChange={setRoleFilter}
          />
          <FilterDropdown
            label="All Status"
            value={statusFilter}
            options={userStatusOptions}
            onChange={setStatusFilter}
          />
        </div>
      )}
    </div>
  );
}

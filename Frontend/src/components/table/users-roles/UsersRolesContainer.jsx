"use client";

import { useMemo } from "react";
import { Eye, Edit } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import UsersToolbar from "./UsersToolbar";
import UsersCardsContainer from "./UsersCardsContainer";
import UsersTable from "./UsersTable";
import RolesPermissionsTab from "@/components/users-roles/RolesPermissionsTab";
import InviteUserDialog from "@/components/users-roles/InviteUserDialog";
import { useUsers, useUsersTableParams, USERS_TABS } from "@/hooks/users";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { toTeamMember } from "@/lib/user";

export default function UsersRolesContainer({ revealDelay = 0 }) {
  // The URL is the state. Every filter below reads and writes it, so the view
  // survives a reload and the back button steps through it.
  const params = useUsersTableParams();
  const isRolesTab = params?.tab === USERS_TABS.ROLES;

  // Skipped entirely while the roles tab is open — there is no table to fill,
  // and fetching it anyway would be a request nobody reads.
  const usersQuery = useUsers(params?.queryParams, { enabled: !isRolesTab });

  const selectUser = useUsersRolesStore((s) => s.selectUser);
  const openInviteModal = useUsersRolesStore((s) => s.openInviteModal);
  const openEditUserModal = useUsersRolesStore((s) => s.openEditUserModal);

  const rows = useMemo(
    () => (usersQuery?.data?.data ?? []).map(toTeamMember),
    [usersQuery?.data?.data],
  );
  const meta = usersQuery?.data?.meta;
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);

  // No remove action: a staff account is never deleted. Suspending it is the
  // way out, and that is a status change inside Edit.
  const getRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => selectUser?.(item?.id),
    },
    {
      label: "Edit User",
      icon: <Edit />,
      onSelect: () => openEditUserModal?.(item),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <UsersToolbar
          activeTab={params?.tab}
          setActiveTab={params?.setTab}
          search={params?.search}
          setSearch={params?.setSearch}
          roleFilter={params?.role}
          setRoleFilter={params?.setRole}
          statusFilter={params?.status}
          setStatusFilter={params?.setStatus}
          limit={params?.limit}
          setLimit={params?.setLimit}
          onInviteUser={openInviteModal}
        />

        {isRolesTab ? (
          <RolesPermissionsTab />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <UsersCardsContainer
                items={rows}
                getRowActions={getRowActions}
                onSelectUser={selectUser}
                isLoading={usersQuery?.isPending}
                error={usersQuery?.error}
              />
            </div>

            <UsersTable
              pageItems={rows}
              getRowActions={getRowActions}
              onSelectUser={selectUser}
              isLoading={usersQuery?.isPending}
              error={usersQuery?.error}
            />

            {/* Hidden until the first page lands, so the pager never shows
                "0 team members · Page 1 of 1" during the initial load. */}
            {meta ? (
              <div className="relative w-full">
                <TablePagination
                  totalCount={meta?.total ?? 0}
                  itemLabel="team members"
                  page={meta?.page ?? 1}
                  pageCount={pageCount}
                  // Clamping lives in `goToPage`, so the footer just says which
                  // direction it wants to move.
                  onPrev={() => params?.goToPage?.((meta?.page ?? 1) - 1, pageCount)}
                  onNext={() => params?.goToPage?.((meta?.page ?? 1) + 1, pageCount)}
                  onPageChange={(next) => params?.goToPage?.(next, pageCount)}
                />
              </div>
            ) : null}
          </>
        )}

        <InviteUserDialog />
      </CommonCard>
    </Reveal>
  );
}

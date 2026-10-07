"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit, UserMinus } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import TablePagination from "@/components/table/common/TablePagination";
import UsersToolbar from "./UsersToolbar";
import UsersCardsContainer from "./UsersCardsContainer";
import UsersTable from "./UsersTable";
import RolesPermissionsTab from "@/components/users-roles/RolesPermissionsTab";
import WithdrawInvitationDialog from "@/components/users-roles/WithdrawInvitationDialog";
import { useUsers, useUsersTableParams, USERS_TABS } from "@/hooks/users";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { toTeamMember } from "@/lib/user";
import { useCurrentUser } from "@/hooks/auth";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";

export default function UsersRolesContainer({ revealDelay = 0 }) {
  // The URL is the state. Every filter below reads and writes it, so the view
  // survives a reload and the back button steps through it.
  const params = useUsersTableParams();
  const isRolesTab = params?.tab === USERS_TABS.ROLES;

  // Skipped entirely while the roles tab is open — there is no table to fill,
  // and fetching it anyway would be a request nobody reads.
  const usersQuery = useUsers(params?.queryParams, { enabled: !isRolesTab });

  const selectUser = useUsersRolesStore((s) => s.selectUser);
  // Invite and Edit are full pages (7 Oct 2026): the permissions run to 25
  // modules, more than a dialog holds comfortably.
  const router = useRouter();

  // Users & Roles is on the per-user permissions (7 Oct 2026): a control the
  // API would refuse is not offered. The owner's account is editable only by
  // the owner.
  const { canAccess } = usePermissions();
  const { data: me } = useCurrentUser();
  const mayInvite = canAccess(Module.USERS, Action.CREATE);
  // Which pending invitation the confirm dialog is about — local and
  // disposable, like any open/closed flag.
  const [withdrawing, setWithdrawing] = useState(null);
  const mayEdit = (item) =>
    canAccess(Module.USERS, Action.EDIT) && (item?.role !== "SUPER_ADMIN" || me?.role === "SUPER_ADMIN");

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
    ...(mayEdit(item)
      ? [
          {
            label: "Edit User",
            icon: <Edit />,
            onSelect: () => router.push(`/dashboard/users-roles/${item?.id}/edit`),
          },
        ]
      : []),
    // A pending invitation can be withdrawn — the one permanent delete; any
    // account that has signed in is suspended instead.
    ...(item?.rawStatus === "INVITED" && mayInvite
      ? [
          {
            label: "Withdraw Invitation",
            icon: <UserMinus />,
            onSelect: () => setWithdrawing(item),
          },
        ]
      : []),
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
          onInviteUser={mayInvite ? () => router.push("/dashboard/users-roles/invite") : undefined}
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

        <WithdrawInvitationDialog user={withdrawing} onClose={() => setWithdrawing(null)} />
      </CommonCard>
    </Reveal>
  );
}

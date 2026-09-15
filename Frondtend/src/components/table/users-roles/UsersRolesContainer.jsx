"use client";

import { Eye, Edit, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import TablePagination from "@/components/table/common/TablePagination";
import UsersToolbar from "./UsersToolbar";
import UsersCardsContainer from "./UsersCardsContainer";
import UsersTable from "./UsersTable";
import RolesPermissionsTab from "@/components/users-roles/RolesPermissionsTab";
import InviteUserDialog from "@/components/users-roles/InviteUserDialog";
import DeleteUserDialog from "@/components/users-roles/DeleteUserDialog";

export default function UsersRolesContainer({ revealDelay = 0 }) {
  const activeTab = useUsersRolesStore((s) => s.activeTab);
  const setActiveTab = useUsersRolesStore((s) => s.setActiveTab);
  const search = useUsersRolesStore((s) => s.search);
  const setSearch = useUsersRolesStore((s) => s.setSearch);
  const roleFilter = useUsersRolesStore((s) => s.roleFilter);
  const setRoleFilter = useUsersRolesStore((s) => s.setRoleFilter);
  const statusFilter = useUsersRolesStore((s) => s.statusFilter);
  const setStatusFilter = useUsersRolesStore((s) => s.setStatusFilter);
  const page = useUsersRolesStore((s) => s.page);
  const nextPage = useUsersRolesStore((s) => s.nextPage);
  const prevPage = useUsersRolesStore((s) => s.prevPage);
  const selectUser = useUsersRolesStore((s) => s.selectUser);
  const openInviteModal = useUsersRolesStore((s) => s.openInviteModal);
  const openEditUserModal = useUsersRolesStore((s) => s.openEditUserModal);
  const openDeleteModal = useUsersRolesStore((s) => s.openDeleteModal);

  const getPageUsers = useUsersRolesStore((s) => s.getPageUsers);
  const getPageCount = useUsersRolesStore((s) => s.getPageCount);
  const getFilteredCount = useUsersRolesStore((s) => s.getFilteredCount);

  const pageItems = getPageUsers?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

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
    "separator",
    {
      label: "Remove User",
      icon: <Trash2 />,
      variant: "destructive",
      onSelect: () => openDeleteModal?.(item?.id),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <UsersToolbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          search={search}
          setSearch={setSearch}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onInviteUser={openInviteModal}
        />

        {activeTab === "roles" ? (
          <RolesPermissionsTab />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3">
              <UsersCardsContainer
                items={pageItems}
                getRowActions={getRowActions}
                onSelectUser={selectUser}
              />
            </div>

            <UsersTable
              pageItems={pageItems}
              getRowActions={getRowActions}
              onSelectUser={selectUser}
            />

            <div className="relative w-full">
              <TablePagination
                totalCount={filteredCount}
                itemLabel="team members"
                page={page}
                pageCount={pageCount}
                onPrev={prevPage}
                onNext={nextPage}
              />
            </div>
          </>
        )}

        <InviteUserDialog />
        <DeleteUserDialog />
      </CommonCard>
    </Reveal>
  );
}

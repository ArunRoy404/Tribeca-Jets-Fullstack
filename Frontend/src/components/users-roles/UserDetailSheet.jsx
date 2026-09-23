"use client";

import { useState } from "react";
import { Pencil, UserCheck, UserX } from "lucide-react";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import DetailTabNav from "@/components/common/DetailTabNav";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import TableStatus from "@/components/table/common/TableStatus";
import { useUpdateUser, useUser } from "@/hooks/users";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import UserDocumentsTab from "@/components/users-roles/tabs/UserDocumentsTab";
import { formatLastLogin, isPendingInvite, toTeamMember } from "@/lib/user";

/** Renders a createdBy/updatedBy actor, which is null for seeded records. */
function actorName(actor) {
  if (!actor) return "—";
  return (
    [actor.firstName, actor.lastName].filter(Boolean).join(" ") ||
    actor.email ||
    "—"
  );
}

/**
 * Two tabs, and the second is client adjustment #7 — a folder per broker for
 * tax forms. Details stays first because it is what the sheet was opened for.
 */
const TABS = [
  { id: "details", label: "Details" },
  { id: "documents", label: "Documents" },
];

export default function UserDetailSheet() {
  const selectedId = useUsersRolesStore((s) => s.selectedUserId);
  const close = useUsersRolesStore((s) => s.closeUserDetail);
  const openEditUserModal = useUsersRolesStore((s) => s.openEditUserModal);

  // Fetched rather than read from the table's page, so the sheet shows the
  // full record — invited-by, client counts — that the list projection omits.
  const { data, isPending, error, refetch } = useUser(selectedId);
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { canWrite } = usePermissions();

  // Local and disposable: which tab is showing inside a sheet is not something
  // another component reads, and it is not worth a URL param on an overlay.
  const [tab, setTab] = useState(TABS[0].id);

  // Opening a different person must not land on the tab left over from the
  // last one — "Documents" showing somebody else's folder for a frame is the
  // kind of thing nobody reports and everybody notices.
  //
  // Adjusted during render rather than in an effect: React re-runs this
  // component before committing, so the tab is already correct on the first
  // paint. An effect would show the stale tab for a frame and then move it.
  const [lastOpened, setLastOpened] = useState(selectedId);
  if (selectedId !== lastOpened) {
    setLastOpened(selectedId);
    setTab(TABS[0].id);
  }

  const item = data ? toTeamMember(data) : null;
  const isSuspended = item?.rawStatus === "SUSPENDED";

  // A pending invitation has no status anyone may set — it activates itself
  // when the invitee sets a password. Withdrawing it is Remove, not Suspend.
  const isInvited = isPendingInvite(item?.rawStatus);

  const toggleAccess = () => {
    if (!item?.id) return;
    updateUser({
      id: item.id,
      status: isSuspended ? "ACTIVE" : "SUSPENDED",
    });
  };

  return (
    <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && close()}>
      <SheetContent className="data-[side=right]:w-full sm:data-[side=right]:max-w-175 gap-4 p-6 overflow-y-auto">
        {!item ? (
          <>
            {/* The sheet still needs an accessible name while it is empty. */}
            <SheetTitle className="sr-only">Team member</SheetTitle>
            <TableStatus
              isLoading={isPending}
              error={error}
              isEmpty={!isPending && !error}
              emptyMessage="Team member not found"
              emptyHint="They may have been removed."
              onRetry={refetch}
            />
          </>
        ) : (
          <>
            <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
              <div className="flex flex-col gap-2 items-start">
                <div className="flex gap-2 items-center flex-wrap">
                  <SheetTitle className="font-montserrat font-bold text-[20px] text-black-text">
                    {item.name}
                  </SheetTitle>
                  <StatusBadge status={item.status} bordered />
                </div>
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">
                  {item.email}
                </p>
                {isInvited && (
                  <p className="font-montserrat font-normal text-[12px] text-muted-foreground">
                    Invitation pending — the account activates when they set
                    their password.
                  </p>
                )}
              </div>
            </div>

            <DetailTabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

            {tab === "documents" ? (
              <UserDocumentsTab
                userId={item.id}
                userName={item.name}
                canManage={canWrite(Permission.MANAGE_USERS)}
              />
            ) : (
            <SectionCard>
              <div className="flex gap-4 w-full">
                <DetailField label="USER NAME" value={item.name} labelClassName="text-[14px]" />
                <DetailField label="EMAIL" value={item.email} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="ROLE" value={item.roleLabel} valueClassName="text-purple" labelClassName="text-[14px]" />
                <DetailField label="PERMISSION LEVEL" value={item.permissionLevel} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="PHONE" value={item.phone || "—"} labelClassName="text-[14px]" />
                <DetailField
                  label="TWO-FACTOR"
                  value={item.twoFactorEnabled ? "Enabled" : "Disabled"}
                  labelClassName="text-[14px]"
                />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField
                  label="ASSIGNED CLIENTS"
                  value={String(data?._count?.assignedClients ?? 0)}
                  labelClassName="text-[14px]"
                />
                <DetailField
                  label="ORIGINATED CLIENTS"
                  value={String(data?._count?.originatedClients ?? 0)}
                  labelClassName="text-[14px]"
                />
              </div>
              {/* Columns the design asks for that nothing can supply until the
                  trips and quotes modules exist. */}
              <div className="flex gap-4 w-full">
                <DetailField label="ACTIVE LEADS" value={item.activeLeads} labelClassName="text-[14px]" />
                <DetailField label="ACTIVE TRIPS" value={item.activeTrips} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="LAST LOGIN" value={item.lastLogin} labelClassName="text-[14px]" />
                <DetailField
                  label="INVITED BY"
                  value={actorName(data?.createdBy)}
                  labelClassName="text-[14px]"
                />
              </div>
              {/* The audit trail every module now carries. For a user account,
                  "created" is the invitation — it is the same event. */}
              <div className="flex gap-4 w-full">
                <DetailField
                  label="INVITED ON"
                  value={formatLastLogin(item.createdAt)}
                  labelClassName="text-[14px]"
                />
                <DetailField
                  label="LAST UPDATED BY"
                  value={actorName(data?.updatedBy)}
                  labelClassName="text-[14px]"
                />
              </div>
            </SectionCard>
            )}

            <div className="border-t border-secondary flex items-center justify-between gap-3 pt-4 w-full mt-auto flex-wrap">
              <Button
                variant="outline"
                className="gap-2 px-4"
                onClick={() => {
                  close();
                  openEditUserModal(item);
                }}
              >
                <Pencil className="size-4" />
                Edit
              </Button>

              <div className="flex items-center gap-2">
                {/* One control, both directions: a suspended account needs a
                    way back, and a separate "Reactivate" button that is
                    disabled most of the time reads worse than a toggle.
                    Absent entirely while the invitation is pending. */}
                {!isInvited && (
                  <Button
                    variant="outline"
                    className="gap-2 px-4"
                    onClick={toggleAccess}
                    disabled={isUpdating}
                  >
                    {isSuspended ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
                    {isSuspended ? "Reactivate" : "Suspend"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { Pencil, Trash2, KeyRound, UserX } from "lucide-react";
import { useUsersRolesStore } from "@/store/useUsersRolesStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";

export default function UserDetailSheet() {
  const selectedId = useUsersRolesStore((s) => s.selectedUserId);
  const close = useUsersRolesStore((s) => s.closeUserDetail);
  const getUserById = useUsersRolesStore((s) => s.getUserById);
  const openEditUserModal = useUsersRolesStore((s) => s.openEditUserModal);
  const openDeleteModal = useUsersRolesStore((s) => s.openDeleteModal);

  const item = selectedId ? getUserById(selectedId) : null;

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && close()}>
      <SheetContent className="data-[side=right]:w-full sm:data-[side=right]:max-w-175 gap-4 p-6 overflow-y-auto">
        {item && (
          <>
            <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
              <div className="flex flex-col gap-2 items-start">
                <div className="flex gap-2 items-center">
                  <p className="font-montserrat font-bold text-[20px] text-black-text">{item.name}</p>
                  <StatusBadge status={item.status} bordered />
                </div>
                <p className="font-montserrat font-normal text-[12px] text-muted-foreground">{item.email}</p>
              </div>
            </div>

            <SectionCard>
              <div className="flex gap-4 w-full">
                <DetailField label="USER NAME" value={item.name} labelClassName="text-[14px]" />
                <DetailField label="EMAIL" value={item.email} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="ROLE" value={item.role} valueClassName="text-purple" labelClassName="text-[14px]" />
                <DetailField label="PERMISSION LEVEL" value={item.permissionLevel} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="ACTIVE LEADS" value={item.activeLeads} labelClassName="text-[14px]" />
                <DetailField label="ACTIVE TRIPS" value={item.activeTrips} labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="CONVERSION RATE" value={item.conversionRate} labelClassName="text-[14px]" />
                <DetailField label="REVENUE" value={item.revenue} valueClassName="text-success" labelClassName="text-[14px]" />
              </div>
              <div className="flex gap-4 w-full">
                <DetailField label="LAST LOGIN" value={item.lastLogin} labelClassName="text-[14px]" />
                <DetailField label="STATUS" value={item.status} labelClassName="text-[14px]" />
              </div>
            </SectionCard>

            <div className="border-t border-secondary flex items-center justify-between gap-3 pt-4 w-full mt-auto">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2 px-4"
                  onClick={() => {
                    close();
                    openEditUserModal(item);
                  }}
                >
                  <Pencil className="size-4" />
                  Edit Role
                </Button>
                <Button variant="outline" className="gap-2 px-4">
                  <KeyRound className="size-4" />
                  Reset Password
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2 px-4">
                  <UserX className="size-4" />
                  Deactivate
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2 px-4"
                  onClick={() => {
                    close();
                    openDeleteModal(item.id);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

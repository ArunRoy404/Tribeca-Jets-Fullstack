"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import RoleBadge from "@/components/users-roles/RoleBadge";

export default function UserCard({ item, onClick, actions }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-border rounded-md p-4 flex flex-col gap-3 shadow-sm cursor-pointer hover:bg-black/5 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-montserrat font-bold text-[13px] text-foreground">
            {item?.name}
          </span>
          <span className="font-montserrat text-[12px] text-muted-foreground">
            {item?.email}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          {actions && <RowActionsMenu items={actions} />}
          {item?.status && <StatusBadge status={item?.status} bordered />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
        <div className="flex flex-col gap-1">
          <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
            Role
          </span>
          <RoleBadge role={item?.role} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
            Permission
          </span>
          <span className="font-montserrat font-semibold text-[12px] text-foreground">
            {item?.permissionLevel}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
            Revenue
          </span>
          <span className="font-montserrat font-semibold text-[12px] text-success">
            {item?.revenue}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
            Last Login
          </span>
          <span className="font-montserrat font-semibold text-[12px] text-foreground">
            {item?.lastLogin}
          </span>
        </div>
      </div>
    </div>
  );
}

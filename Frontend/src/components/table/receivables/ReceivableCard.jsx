"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";

export default function ReceivableCard({ item, onClick, actions }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-border rounded-md p-4 flex flex-col gap-3 shadow-sm cursor-pointer hover:bg-black/5 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-montserrat font-bold text-[13px] text-foreground">
            {item?.client}
          </span>
          <span className="font-montserrat font-semibold text-[11px] text-purple">
            {item?.tripId}
          </span>
          <span className="font-montserrat font-medium text-[11px] text-muted-foreground">
            {item?.invoice}
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
            Amount
          </span>
          <span className="font-montserrat font-semibold text-[12px] text-foreground">
            {item?.amount}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
            Paid
          </span>
          <span className="font-montserrat font-semibold text-[12px] text-success">
            {item?.paid}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
            Balance
          </span>
          <span className="font-montserrat font-semibold text-[12px] text-destructive">
            {item?.balance}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
            Due Date
          </span>
          <span className="font-montserrat font-semibold text-[12px] text-foreground">
            {item?.due}
          </span>
        </div>
      </div>
    </div>
  );
}

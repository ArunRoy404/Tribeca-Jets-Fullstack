"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { cn } from "@/lib/utils";

function Field({ label, value, valueClassName = "text-foreground" }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
        {label}
      </span>
      <span className={cn("font-montserrat font-semibold text-[12px] truncate", valueClassName)}>{value}</span>
    </div>
  );
}

/** One operator bill below `lg` — the same data and actions as the table row. */
export default function OperatorPaymentCard({ item, onClick, actions, archived = false }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-border rounded-md p-4 flex flex-col gap-3 shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-montserrat font-bold text-[13px] text-foreground truncate">{item?.operator}</span>
          <span className="font-montserrat font-semibold text-[11px] text-purple">
            {item?.number} · {item?.tripReference}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          {actions && <RowActionsMenu items={actions} />}
          {!archived && item?.state && <StatusBadge status={item?.state} bordered />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
        <Field label="Amount" value={item?.total} />
        <Field label="Paid" value={item?.paid} valueClassName="text-success" />
        <Field
          label="Balance"
          value={item?.balance}
          valueClassName={item?.hasBalance ? "text-destructive" : "text-foreground"}
        />
        {archived ? <Field label="Removed On" value={item?.deletedAtLabel} /> : <Field label="Due Date" value={item?.due} />}
      </div>
    </div>
  );
}

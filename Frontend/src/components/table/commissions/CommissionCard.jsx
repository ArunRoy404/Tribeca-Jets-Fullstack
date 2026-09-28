"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";

function Field({ label, value, valueClassName = "text-foreground" }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="font-space-grotesk font-semibold text-[10px] text-muted-foreground tracking-widest uppercase">
        {label}
      </span>
      <span className={`font-montserrat font-semibold text-[12px] truncate ${valueClassName}`}>{value}</span>
    </div>
  );
}

/** One commission below `lg` — the same data and actions as the table row. */
export default function CommissionCard({ item, onClick, actions }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-border rounded-md p-4 flex flex-col gap-3 shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-montserrat font-bold text-[13px] text-foreground truncate">{item?.recipient}</span>
          <span className="font-montserrat font-semibold text-[11px] text-purple">
            {item?.reference} · {item?.tripReference}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          {actions && <RowActionsMenu items={actions} />}
          {item?.status && <StatusBadge status={item?.status} bordered />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
        <Field label="Amount" value={item?.amount} valueClassName="text-success" />
        <Field label="Structure" value={item?.structure} />
        <Field label="Paid On" value={item?.paidAt} />
        <Field label="Type" value={item?.type} />
      </div>
    </div>
  );
}

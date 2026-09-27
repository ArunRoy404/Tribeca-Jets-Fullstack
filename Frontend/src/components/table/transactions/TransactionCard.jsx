"use client";

import StatusBadge from "@/components/common/StatusBadge";
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

/** One movement below `lg` — the same data as the table row. */
export default function TransactionCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border border-border rounded-md p-4 flex flex-col gap-3 shadow-card transition-colors",
        onClick && "cursor-pointer hover:border-purple/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-montserrat font-bold text-[13px] text-foreground truncate">{item?.counterparty}</span>
          <span className="font-montserrat font-semibold text-[11px] text-purple">
            {item?.document} · {item?.tripReference}
          </span>
        </div>
        <StatusBadge status={item?.kind} bordered />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
        <Field
          label="Amount"
          value={item?.amount}
          valueClassName={!item?.known ? "text-muted-foreground" : item?.incoming ? "text-success" : "text-destructive"}
        />
        <Field label="Date" value={item?.date} />
        <Field label="Method" value={item?.method} />
        <Field label="Reference" value={item?.reference} />
      </div>
    </div>
  );
}

"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import EmptyLegMatchBadge from "@/components/empty-legs/EmptyLegMatchBadge";
import { cn } from "@/lib/utils";

function Field({ label, value, valueClassName }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <p className={cn("font-montserrat font-medium text-[12px] text-foreground truncate", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

/** One empty leg below `lg` — the same data and actions as the table row. */
export default function EmptyLegCard({ item, actions, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3 p-3.5 w-full rounded-lg border border-border bg-white shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 font-montserrat font-bold text-[15px]">
            <span className="text-purple">{item?.origin}</span>
            <span className="text-muted-foreground font-normal">→</span>
            <span className="text-foreground">{item?.destination}</span>
          </div>
          <p className="font-montserrat text-[11px] text-muted-foreground truncate">{item?.reference}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {item?.status && <StatusBadge status={item?.status} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full bg-secondary/30 p-2.5 rounded-md">
        <Field label="Aircraft" value={item?.aircraft} />
        <Field label="Operator" value={item?.operator} valueClassName="text-purple font-bold" />
      </div>

      <div className="grid grid-cols-3 gap-2 w-full items-center">
        <Field label="Departure" value={item?.date} />
        <Field label="Price" value={item?.price} valueClassName="text-success font-bold text-[13px]" />
        <Field
          label="Expiry"
          value={item?.expiry}
          valueClassName={item?.lapsed ? "text-destructive font-semibold" : "text-muted-foreground"}
        />
      </div>

      <EmptyLegMatchBadge count={item?.matchCount} dateCount={item?.dateMatchCount} className="w-fit" />
    </div>
  );
}

"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
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

export default function EmptyLegCard({ item, actions, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3 p-3.5 w-full rounded-lg border border-border bg-white shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-1.5 font-montserrat font-bold text-[15px]">
          <span className="text-purple">{item?.origin}</span>
          <span className="text-muted-foreground font-normal">→</span>
          <span className="text-foreground">{item?.destination}</span>
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

      <div className="grid grid-cols-4 gap-2 w-full items-center">
        <Field label="Date" value={item?.date} />
        <Field label="Price" value={item?.price} valueClassName="text-success font-bold text-[13px]" />
        <Field label="Expiry" value={item?.expiry} valueClassName="text-destructive font-semibold" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">Matches</p>
          <Badge tone="success" size="sm" className="w-fit font-bold text-[10px]">
            {item?.matches} Matches
          </Badge>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { cn } from "@/lib/utils";

function Field({ label, value, valueClassName }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <p className={cn("font-montserrat font-medium text-[12px] text-foreground truncate", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

export default function LeadCard({ item, actions, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3 p-3.5 w-full rounded-lg border border-border bg-white shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex flex-col min-w-0">
          <h4 className="font-montserrat font-bold text-[14px] text-foreground leading-tight truncate">
            {item?.name}
          </h4>
          {item?.company && (
            <p className="font-montserrat text-[11px] text-muted-foreground truncate">
              {item?.company}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {item?.status && <StatusBadge status={item?.status} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full bg-secondary/30 p-2.5 rounded-md text-[12px]">
        <Field label="Email" value={item?.email} />
        <Field label="Phone" value={item?.phone} />
      </div>

      <div className="grid grid-cols-3 gap-2 w-full items-center border-t border-border/50 pt-2 text-[11px]">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-montserrat text-[10px] text-muted-foreground">Source</p>
          {item?.source && <StatusBadge status={item?.source} className="text-[10px] px-1.5 py-0.5" />}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-montserrat text-[10px] text-muted-foreground">Route</p>
          <div className="flex items-center gap-1 font-montserrat font-semibold text-[11px] text-purple">
            <span>{item?.origin}</span>
            <ArrowRight className="size-3 text-muted-foreground" />
            <span>{item?.destination}</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-montserrat text-[10px] text-muted-foreground">Priority</p>
          {item?.priority && <StatusBadge status={item?.priority} className="text-[10px] px-1.5 py-0.5" />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full items-center border-t border-border/50 pt-2 text-[11px]">
        <Field label="Broker" value={item?.broker} valueClassName="font-semibold" />
        <Field label="Follow-up Due" value={item?.nextFollowUp} valueClassName="font-semibold" />
        <Field label="Created" value={item?.createdDate} valueClassName="text-muted-foreground" />
      </div>
    </div>
  );
}

"use client";

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

export default function AgentCard({ item, actions, onClick }) {
  const initials = (item?.name ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3 p-3.5 w-full rounded-lg border border-border bg-white shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-secondary text-foreground flex items-center justify-center font-montserrat font-bold text-[13px] border border-border shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="font-montserrat font-bold text-[14px] text-foreground leading-tight truncate">
              {item?.name}
            </h4>
            <p className="font-montserrat text-[11px] text-muted-foreground truncate">
              {item?.role || item?.company || "Broker"}
            </p>
          </div>
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

      <div className="grid grid-cols-4 gap-2 w-full items-center border-t border-border/50 pt-2 text-[11px]">
        <Field label="Active Leads" value={item?.activeLeads} valueClassName="font-bold text-center sm:text-left" />
        <Field label="Active Trips" value={item?.activeTrips} valueClassName="font-bold text-center sm:text-left" />
        <Field label="Conversion" value={item?.conversionRate} valueClassName="font-bold text-success text-center sm:text-left" />
        <Field label="Follow-ups" value={item?.followUpsDue} valueClassName="font-bold text-center sm:text-left" />
      </div>
    </div>
  );
}

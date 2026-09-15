"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { cn } from "@/lib/utils";

function Field({ label, value, valueClassName }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <p className={cn("font-montserrat font-medium text-[12px] text-foreground truncate", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

export default function ClientCard({ item, actions, onClick }) {
  const initials = item?.name
    ?.split(" ")
    ?.map((n) => n?.[0])
    ?.join("") ?? "";

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
          <div className="flex flex-col">
            <h4 className="font-montserrat font-bold text-[14px] text-foreground leading-tight">{item?.name}</h4>
            {item?.company && <p className="font-montserrat text-[11px] text-muted-foreground">{item?.company}</p>}
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

      <div className="grid grid-cols-3 gap-2 w-full items-center">
        <Field label="Type" value={item?.type} valueClassName="text-info font-bold" />
        <Field label="Pref. Airports" value={item?.prefAirports} />
        <Field label="Broker" value={item?.broker} />
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px]">Last Trip</span>
          <span className="font-bold text-purple">{item?.lastTripId} • {item?.lastTripDate}</span>
        </div>
        {item?.nextFollowUpDate && (
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-[10px]">Next Follow-up</span>
            <span
              className={cn(
                "font-bold",
                item?.nextFollowUpStatus === "Overdue"
                  ? "text-destructive"
                  : item?.nextFollowUpStatus === "Due Today"
                  ? "text-warning"
                  : "text-success"
              )}
            >
              • {item?.nextFollowUpDate} ({item?.nextFollowUpStatus})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

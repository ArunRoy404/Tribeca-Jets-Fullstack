"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Check, X } from "lucide-react";
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

export default function ItineraryCard({ item, actions, onClick }) {
  const isConfirmed = item?.confirmed === "Yes";

  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3 p-3.5 w-full rounded-lg border border-border bg-white shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2">
          <p className="font-montserrat font-bold text-[14px] text-purple">{item?.id}</p>
          <span className="text-muted-foreground text-[12px]">•</span>
          <p className="font-montserrat font-semibold text-[13px] text-foreground">{item?.client}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {item?.tripStatus && <StatusBadge status={item?.tripStatus} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full bg-secondary/30 p-2.5 rounded-md">
        <Field label="Route" value={`${item?.from ?? ""} → ${item?.to ?? ""}`} valueClassName="font-bold" />
        <Field label="Departure" value={item?.departure} />
      </div>

      <div className="grid grid-cols-3 gap-2 w-full">
        <Field label="Passengers" value={item?.passengersCount} />
        <Field label="Tail #" value={item?.tailNumber} valueClassName="font-bold text-foreground" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">Confirmed</p>
          <div className="flex items-center gap-1 font-montserrat font-bold text-[12px]">
            {isConfirmed ? (
              <span className="flex items-center gap-1 text-success">
                <Check className="size-3.5" /> Yes
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground/70">
                <X className="size-3.5" /> NO
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

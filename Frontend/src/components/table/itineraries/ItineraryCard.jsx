"use client";

import { Check, X } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function ItineraryCard({ item, actions, onClick, selected, onToggleRow, selectable = false, archived = false }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3 p-3.5 w-full rounded-lg border border-border bg-white shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          {selectable && (
            <Checkbox
              checked={Boolean(selected)}
              onCheckedChange={() => onToggleRow?.(item?.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select the itinerary for ${item?.tripReference}`}
            />
          )}
          <p className="font-montserrat font-bold text-[14px] text-purple">{item?.tripReference}</p>
          <span className="text-muted-foreground text-[12px]">•</span>
          <p className="font-montserrat font-semibold text-[13px] text-foreground truncate">{item?.client}</p>
          {item?.isRestored && <RestoredBadge at={item?.restoredAt} by={item?.restoredByName} />}
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!archived && item?.tripStatus && <StatusBadge status={item?.tripStatus} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full bg-secondary/30 p-2.5 rounded-md">
        <Field label="Route" value={`${item?.originCode ?? ""} → ${item?.destinationCode ?? ""}`} valueClassName="font-bold" />
        <Field label="Departure" value={item?.departure} />
      </div>

      {archived ? (
        <div className="grid grid-cols-2 gap-2 w-full">
          <Field label="Removed On" value={item?.deletedAtLabel} />
          <Field label="Removed By" value={item?.deletedByName} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 w-full">
          <Field label="Passengers" value={item?.passengerCount || "—"} />
          <Field label="Tail #" value={item?.aircraftTail} valueClassName="font-bold text-foreground" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">Confirmed</p>
            <div className="flex items-center gap-1 font-montserrat font-bold text-[12px]">
              {item?.confirmed ? (
                <span className="flex items-center gap-1 text-success">
                  <Check className="size-3.5" /> Yes
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground/70">
                  <X className="size-3.5" /> No
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

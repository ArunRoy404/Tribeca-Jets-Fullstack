"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Plane } from "lucide-react";
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

export default function FlightTrackingCard({ flight, actions, onClick }) {
  if (!flight) return null;

  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3 p-3.5 w-full rounded-lg border border-border bg-white shadow-card cursor-pointer hover:border-purple/40 transition-colors"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2">
          <p className="font-montserrat font-bold text-[14px] text-purple">{flight?.tripId}</p>
          <span className="text-muted-foreground text-[12px]">•</span>
          <p className="font-montserrat font-bold text-[12px] text-foreground">{flight?.tailNumber}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={flight?.flightStatus} bordered />
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      {/* Client & Aircraft Info */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <Field label="Client" value={flight?.client} />
        <Field label="Aircraft / Operator" value={`${flight?.aircraft} (${flight?.operator})`} valueClassName="text-purple" />
      </div>

      {/* Route & Times */}
      <div className="bg-secondary/40 rounded-md p-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className="font-montserrat font-bold text-[16px] text-foreground">{flight?.origin}</p>
          <p className="font-montserrat text-[11px] text-muted-foreground">{flight?.departureTime}</p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <Plane className="size-4 text-purple rotate-90" />
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-purple transition-all duration-300"
              style={{ width: `${flight?.progressPercentage}%` }}
            />
          </div>
          <p className="font-montserrat text-[9px] text-muted-foreground truncate">{flight?.progressLabel}</p>
        </div>
        <div className="flex flex-col items-end">
          <p className="font-montserrat font-bold text-[16px] text-foreground">{flight?.destination}</p>
          <p className="font-montserrat text-[11px] text-muted-foreground">ETA {flight?.etaTime}</p>
        </div>
      </div>

      <p className="font-montserrat text-[11px] text-muted-foreground text-right">{flight?.departureDate}</p>
    </div>
  );
}

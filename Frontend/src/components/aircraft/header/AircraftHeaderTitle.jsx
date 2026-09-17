"use client";

import { Plane } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { archiveEventLabel } from "@/lib/archive";

export default function AircraftHeaderTitle({ aircraft }) {
  if (!aircraft) return null;

  const model = aircraft.model || "—";
  const tailNumber = aircraft.tailNumber || "—";
  const operator = aircraft.operator && aircraft.operator !== "—" ? aircraft.operator : "Unassigned Operator";
  const category = aircraft.category && aircraft.category !== "—" ? aircraft.category : "—";

  const removedLine = aircraft.isArchived
    ? archiveEventLabel("Removed", aircraft.deletedAtLabel, aircraft.deletedByName)
    : null;
  const restoredLine = aircraft.restoredAt
    ? archiveEventLabel(
        aircraft.isArchived ? "Previously restored" : "Restored",
        aircraft.restoredAtLabel,
        aircraft.restoredByName,
      )
    : null;

  return (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <div className="size-12 sm:size-14 rounded-xl bg-purple/10 text-purple border border-purple/20 flex items-center justify-center shrink-0 shadow-xs">
        <Plane className="size-6 text-purple" />
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-montserrat font-bold text-[20px] sm:text-[24px] text-foreground leading-tight truncate">
            {model}
          </h1>
          <StatusBadge status={aircraft.status} bordered />
        </div>

        <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground truncate">
          {tailNumber} · {operator} · {category}
        </p>

        {removedLine ? (
          <p className="font-montserrat text-[12px] text-destructive leading-tight">{removedLine}</p>
        ) : null}
        {restoredLine ? (
          <p className="font-montserrat text-[12px] text-muted-foreground leading-tight">{restoredLine}</p>
        ) : null}
      </div>
    </div>
  );
}

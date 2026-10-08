"use client";

import { MapPin, Building2 } from "lucide-react";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import RestoredBadge from "@/components/common/RestoredBadge";
import { Checkbox } from "@/components/ui/checkbox";

export default function AirportCard({
  airport,
  archived = false,
  selectable = true,
  selected = false,
  onToggleSelect,
  actions,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-2.5 items-start p-3.5 w-full rounded-sm border transition-colors cursor-pointer ${
        selected ? "border-purple bg-purple/5" : "border-border bg-white hover:bg-secondary/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
          {selectable ? <Checkbox checked={selected} onCheckedChange={onToggleSelect} /> : null}
          {/* "KTEB / TEB", or the ICAO alone — many airports have no IATA. */}
          <span className="font-montserrat font-bold text-[14px] text-purple truncate">
            {airport?.codes}
          </span>
        </div>
        {actions?.length ? (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu items={actions} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 w-full">
        <span className="inline-flex flex-wrap items-center gap-2 font-montserrat font-bold text-[13px] text-foreground">
          {airport?.name}
          {airport?.isRestored ? (
            <RestoredBadge at={airport?.restoredAtLabel} by={airport?.restoredByName} />
          ) : null}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground font-montserrat text-[12px]">
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
          <span>
            {airport?.city}, {airport?.state ? `${airport?.state}, ` : ""}{airport?.country}
          </span>
        </div>
      </div>

      {/* The same swap the table makes: on Archived, who removed it and when. */}
      {archived ? (
        <div className="flex items-center justify-between gap-2 w-full pt-2 border-t border-border/40 font-montserrat text-[12px]">
          <span className="text-muted-foreground">Removed</span>
          <span className="font-semibold text-foreground text-right">
            {airport?.deletedAtLabel} · {airport?.deletedByName}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 w-full pt-2 border-t border-border/40 font-montserrat text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Longest Runway</span>
            <span className="font-semibold text-foreground">{airport?.runwayLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Assigned FBO</span>
            <div className="flex items-center gap-1.5 font-bold text-purple min-w-0">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{airport?.assignedFbo}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

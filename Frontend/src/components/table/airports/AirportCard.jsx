"use client";

import { MapPin, Building2 } from "lucide-react";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";

export default function AirportCard({
  airport,
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
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-montserrat font-bold text-[14px] text-purple truncate">
              {airport?.icao}
            </span>
            <span className="text-[12px] font-bold text-foreground">
              / {airport?.iata}
            </span>
          </div>
        </div>
        {actions && (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu items={actions} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 w-full">
        <span className="font-montserrat font-bold text-[13px] text-foreground">
          {airport?.name}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground font-montserrat text-[12px]">
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
          <span>
            {airport?.city}, {airport?.state ? `${airport?.state}, ` : ""}{airport?.country}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 w-full pt-2 border-t border-border/40 font-montserrat text-[12px]">
        <span className="text-muted-foreground">Assigned FBO</span>
        <div className="flex items-center gap-1.5 font-bold text-purple">
          <Building2 className="size-3.5" />
          <span>{airport?.assignedFbo}</span>
        </div>
      </div>
    </div>
  );
}

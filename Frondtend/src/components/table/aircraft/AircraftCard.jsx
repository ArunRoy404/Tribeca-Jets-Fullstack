"use client";

import { Plane } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";

function Field({ label, value, valueClassName = "text-foreground" }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <div className={`font-montserrat font-bold text-[12px] truncate ${valueClassName}`}>{value}</div>
    </div>
  );
}

export default function AircraftCard({ aircraft, selected, onToggleSelect, actions, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white ${
        onClick ? "cursor-pointer hover:bg-secondary/40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <Plane className="size-3.5 text-purple shrink-0" />
            <p className="font-montserrat font-semibold text-[13px] text-purple truncate">
              {aircraft?.model} <span className="text-muted-foreground font-normal">({aircraft?.tailNumber || aircraft?.tail})</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {aircraft?.status && <StatusBadge status={aircraft?.status} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Category" value={aircraft?.category} />
        <Field label="Operator" value={aircraft?.operator} />
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Capacity" value={aircraft?.capacity || aircraft?.pax ? `${aircraft?.capacity || aircraft?.pax} Seats` : null} />
        <Field label="Range" value={aircraft?.rangeNm || aircraft?.range ? `${aircraft?.rangeNm || aircraft?.range} NM` : null} />
      </div>

      <div className="flex items-end justify-between gap-3 w-full pt-2 border-t border-border">
        <Field label="Year of Mfg" value={aircraft?.year} />
        <Field label="Completed Trips" value={aircraft?.trips} valueClassName="text-purple" />
      </div>
    </div>
  );
}

"use client";

import { Star } from "lucide-react";
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

export default function OperatorCard({ operator, selected, onToggleSelect, actions, onClick }) {
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
          <p className="font-montserrat font-semibold text-[13px] text-purple truncate">{operator?.name}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {operator?.status && <StatusBadge status={operator?.status} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Home Base" value={operator?.homeBase} />
        <Field label="Primary Contact" value={operator?.primaryContact} />
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Contact Email" value={operator?.email} />
        <Field
          label="Reliability"
          value={
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 text-amber-500 fill-amber-500" />
              {operator?.reliability}
            </span>
          }
        />
      </div>

      <div className="flex flex-wrap gap-1 w-full pt-1">
        {operator?.aircraftTypes?.map((t) => (
          <span
            key={t}
            className="text-[10px] font-montserrat font-semibold bg-secondary border border-border px-1.5 py-0.5 rounded-full"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="flex items-end justify-between gap-3 w-full pt-2 border-t border-border">
        <Field label="Total Trips" value={operator?.totalTrips} valueClassName="text-purple" />
        <Field label="Total Paid" value={operator?.totalPaid} valueClassName="text-success" />
      </div>
    </div>
  );
}

"use client";

import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";

function Field({ label, value, valueClassName = "text-foreground" }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <p className={`font-montserrat font-bold text-[12px] truncate ${valueClassName}`}>{value}</p>
    </div>
  );
}

export default function SourcingRequestCard({ request, selected, onToggleSelect, actions, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white ${onClick ? "cursor-pointer hover:bg-secondary/40" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
          </span>
          <p className="font-montserrat font-semibold text-[13px] text-purple truncate">{request?.reference}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {request?.stage && <StatusBadge status={request?.stage} bordered />}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Client" value={request?.client} />
        <Field
          label="Route"
          value={
            <span className="inline-flex items-center gap-1">
              {request?.from}
              <ArrowRight className="size-3" />
              {request?.to}
            </span>
          }
        />
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Departure" value={request?.departure} />
        <Field label="Aircraft Needed" value={request?.aircraftNeeded} />
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Operators Contacted" value={request?.operatorsContacted} />
        <Field label="Responses" value={request?.responses} valueClassName="text-purple" />
      </div>

      <div className="flex items-end justify-between gap-3 w-full pt-2 border-t border-border">
        <Field label="Budget" value={request?.budget} valueClassName="text-success" />
        <Field label="Deadline" value={request?.deadline} />
      </div>
    </div>
  );
}

"use client";

import { Route } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import RestoredBadge from "@/components/common/RestoredBadge";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Values arrive already formatted by `toTripRequestRow` — an absent one is an
 * em dash, not an empty string — so this renders what it is given rather than
 * deciding what to show when a field is missing.
 */
function Field({ label, value, valueClassName = "text-foreground" }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="font-montserrat text-[10px] text-muted-foreground whitespace-nowrap">{label}</p>
      <div className={`font-montserrat font-bold text-[12px] truncate ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

export default function TripRequestCard({
  request,
  selected,
  onToggleSelect,
  actions,
  onClick,
  archived = false,
  selectable = true,
}) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-2.5 items-start p-3 w-full rounded-sm border border-border bg-white ${
        onClick ? "cursor-pointer hover:bg-secondary/40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          {selectable ? (
            <span onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
            </span>
          ) : null}
          <div className="flex items-center gap-1.5 min-w-0">
            <Route className="size-3.5 text-purple shrink-0" />
            <p className="font-montserrat font-semibold text-[13px] text-purple truncate">
              {request?.reference}{" "}
              <span className="text-foreground font-normal">{request?.clientName}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {request?.isRestored ? (
            <RestoredBadge at={request?.restoredAtLabel} by={request?.restoredByName} />
          ) : null}
          {request?.status ? <StatusBadge status={request.status} bordered /> : null}
          {actions && <RowActionsMenu items={actions} />}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Route" value={request?.route} />
        <Field label="Departure" value={request?.departureDate} />
      </div>

      <div className="flex items-start justify-between gap-3 w-full">
        <Field label="Passengers" value={request?.passengers} />
        <Field label="Aircraft" value={request?.aircraftPreference ?? "—"} />
      </div>

      <div className="flex items-end justify-between gap-3 w-full pt-2 border-t border-border">
        {archived ? (
          <>
            <Field label="Removed On" value={request?.deletedAtLabel} />
            <Field label="Removed By" value={request?.deletedByName} />
          </>
        ) : (
          <>
            <Field label="Budget" value={request?.estimatedValue} />
            <Field label="Broker" value={request?.brokerName} valueClassName="text-purple" />
          </>
        )}
      </div>
    </div>
  );
}

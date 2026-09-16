"use client";

import Link from "next/link";
import { ArrowLeft, Edit, SlidersHorizontal, Trash2, RotateCcw } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { Button } from "@/components/ui/button";
import { archiveEventLabel } from "@/lib/archive";

export default function AircraftDetailHeader({
  aircraft,
  onEdit,
  onChangeStatus,
  onArchive,
  onRestore,
  mayWrite = true,
}) {
  if (!aircraft) return null;

  // Both lines can be present at once: a record that was restored and later
  // archived again keeps `restoredAt`, and the two together are the history
  // worth showing. `restoredAt` is read directly rather than through
  // `isRestored`, which is false while a record is archived.
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

  /**
   * Every value comes from the record. The mapper already renders anything
   * missing as an em dash, so there are no `||` fallbacks here — this row used
   * to read `${aircraft.rangeNm} nm` against an undefined field and print
   * "undefined nm".
   */
  const stats = [
    { label: "TAIL NUMBER", value: aircraft.tailNumber, tone: "purple" },
    { label: "CATEGORY", value: aircraft.category, tone: "foreground" },
    { label: "CAPACITY", value: aircraft.maxPassengers, tone: "foreground" },
    { label: "RANGE", value: aircraft.range, tone: "success" },
    // Null until the Trips module lands, so this reads "—" rather than 0.
    { label: "TOTAL TRIPS", value: aircraft.totalTrips, tone: "purple" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <Link
        href="/dashboard/aircraft"
        className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Aircraft
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-border shadow-card w-full">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-montserrat font-bold text-[22px] text-foreground leading-tight">
                {aircraft.model}
              </h1>
              <StatusBadge status={aircraft.status} bordered />
            </div>
            <p className="font-montserrat text-[13px] text-muted-foreground">
              {aircraft.tailNumber} · {aircraft.operator} · {aircraft.category}
            </p>
            {/* An archived aircraft is reachable from the Archived tab, so the
                page says so plainly rather than looking like a live record. */}
            {removedLine ? (
              <p className="font-montserrat text-[12px] text-destructive">{removedLine}</p>
            ) : null}
            {restoredLine ? (
              <p className="font-montserrat text-[12px] text-muted-foreground">{restoredLine}</p>
            ) : null}
          </div>
        </div>

        {/* Every control here is a write. A role that may only read gets the
            record and no buttons, rather than three that answer 403. */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          {!mayWrite ? null : aircraft.isArchived ? (
            <Button
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
              onClick={() => onRestore?.(aircraft)}
            >
              <RotateCcw className="size-4" />
              Restore Aircraft
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
                onClick={() => onEdit?.(aircraft)}
              >
                <Edit className="size-4" />
                Edit
              </Button>

              {/* All four statuses, not a Maintenance/Available toggle: the
                  toggle could not reach Inactive or In Service at all, and on
                  a tail that had left the fleet it offered to ground it. */}
              <Button
                className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
                onClick={() => onChangeStatus?.(aircraft)}
              >
                <SlidersHorizontal className="size-4" />
                Change Status
              </Button>

              {/* Soft delete — the aircraft moves to the Archived tab and every
                  quote and trip referencing it keeps working. */}
              <Button
                variant="outline"
                className="h-10 text-[13px] gap-2 font-medium text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex-1 sm:flex-none"
                onClick={() => onArchive?.(aircraft)}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </>
          )}
        </div>
      </div>

      <SimpleStatsRow stats={stats} />
    </div>
  );
}

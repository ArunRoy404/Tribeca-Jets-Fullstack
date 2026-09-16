"use client";

import Link from "next/link";
import { ArrowLeft, Edit, Send, Trash2, RotateCcw } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { Button } from "@/components/ui/button";
import { archiveEventLabel } from "@/lib/archive";

export default function OperatorDetailHeader({
  operator,
  onEdit,
  onRequestQuote,
  onRemove,
  onRestore,
}) {
  if (!operator) return null;

  // Both lines can be present at once: a record that was restored and later
  // archived again keeps `restoredAt`, and the two together are the history
  // worth showing. `restoredAt` is read directly rather than through
  // `isRestored`, which is false while a record is archived.
  const removedLine = operator.isArchived
    ? archiveEventLabel("Removed", operator.deletedAtLabel, operator.deletedByName)
    : null;
  const restoredLine = operator.restoredAt
    ? archiveEventLabel(
        operator.isArchived ? "Previously restored" : "Restored",
        operator.restoredAtLabel,
        operator.restoredByName,
      )
    : null;

  /**
   * Every value comes from the record. The mapper already renders anything
   * missing as an em dash, so there are no `||` fallbacks here — the previous
   * ones ("4.8", "24", "$0") were invented numbers standing in for data the
   * API had deliberately returned as null.
   *
   * `totalTrips` and `totalPaid` stay in the row because the design calls for
   * them; they read "—" until the trips and payments modules can supply them.
   */
  const stats = [
    { label: "RELIABILITY", value: operator.reliability, tone: "foreground" },
    { label: "SAFETY", value: operator.safety, tone: "success" },
    { label: "RESPONSE SPEED", value: operator.responseSpeed, tone: "destructive" },
    { label: "TOTAL TRIPS", value: operator.totalTrips, tone: "purple" },
    { label: "TOTAL PAID", value: operator.totalPaid, tone: "success" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Back Link */}
      <Link
        href="/dashboard/operators"
        className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Operators
      </Link>

      {/* Profile Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-border shadow-card w-full">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-montserrat font-bold text-[22px] text-foreground leading-tight">
                {operator.name}
              </h1>
              <StatusBadge status={operator.status} bordered />
            </div>
            <p className="font-montserrat text-[13px] text-muted-foreground">
              {operator.homeBase}
            </p>
            {/* An archived operator is reachable from the Archived tab, so the
                page says so plainly rather than looking like a live record. */}
            {removedLine ? (
              <p className="font-montserrat text-[12px] text-destructive">
                {removedLine}
              </p>
            ) : null}
            {restoredLine ? (
              <p className="font-montserrat text-[12px] text-muted-foreground">
                {restoredLine}
              </p>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          {operator.isArchived ? (
            <Button
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
              onClick={() => onRestore?.(operator)}
            >
              <RotateCcw className="size-4" />
              Restore Operator
            </Button>
          ) : (
          <>
          <Button
            variant="outline"
            className="h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
            onClick={() => onEdit(operator)}
          >
            <Edit className="size-4" />
            Edit
          </Button>

          <Button
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 text-[13px] gap-2 font-medium flex-1 sm:flex-none"
            onClick={() => onRequestQuote(operator)}
          >
            <Send className="size-4" />
            Request Quote
          </Button>

          {/* Soft delete — the operator moves to the Archived tab and every
              trip, quote and payment referencing it keeps working. */}
          <Button
            variant="outline"
            className="h-10 text-[13px] gap-2 font-medium text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex-1 sm:flex-none"
            onClick={() => onRemove?.(operator)}
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
          </>
          )}
        </div>
      </div>

      {/* Reusable SimpleStatsRow */}
      <SimpleStatsRow stats={stats} />
    </div>
  );
}

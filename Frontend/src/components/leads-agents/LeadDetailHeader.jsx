"use client";

import Link from "next/link";
import { ArrowLeft, Edit, CalendarClock, UserCheck, CheckCircle2, Trash2 } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { archiveEventLabel } from "@/lib/archive";
import { OPEN_LEAD_STAGES } from "@/lib/lead";

export default function LeadDetailHeader({
  lead,
  onEdit,
  onFollowUp,
  onConvert,
  onAssignBroker,
  onArchive,
  mayWrite = true,
}) {
  if (!lead) return null;

  const removedLine = lead.isArchived
    ? archiveEventLabel("Removed", lead.deletedAtLabel, lead.deletedByName)
    : null;
  const restoredLine = lead.restoredAt
    ? archiveEventLabel(
        lead.isArchived ? "Previously restored" : "Restored",
        lead.restoredAtLabel,
        lead.restoredByName,
      )
    : null;

  // Converting a lead that is already Won or Lost is not a thing anyone means
  // to do, so the button is absent rather than disabled.
  const canConvert = OPEN_LEAD_STAGES.includes(lead.rawStage);

  return (
    <div className="flex flex-col gap-6 w-full">
      <Link
        href="/dashboard/leads-agents"
        className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Leads
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-border shadow-card w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-montserrat font-bold text-[22px] text-foreground leading-tight">
              {lead.name}
            </h1>
            {lead.stage ? <StatusBadge status={lead.stage} bordered /> : null}
            {lead.priority ? <StatusBadge status={lead.priority} bordered /> : null}
          </div>
          <p className="font-montserrat text-[13px] text-muted-foreground">
            {[lead.company !== "—" ? lead.company : null, lead.email, lead.phone]
              .filter((part) => part && part !== "—")
              .join(" · ") || "No contact details on file"}
          </p>
          {removedLine ? (
            <p className="font-montserrat text-[12px] text-destructive">{removedLine}</p>
          ) : null}
          {restoredLine ? (
            <p className="font-montserrat text-[12px] text-muted-foreground">{restoredLine}</p>
          ) : null}
        </div>

        {/* Every control here is a write. A read-only role gets the record and
            no buttons, rather than four that answer 403. */}
        {!mayWrite || lead.isArchived ? null : (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-10 text-[13px] gap-2 font-medium"
              onClick={onEdit}
            >
              <Edit className="size-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="h-10 text-[13px] gap-2 font-medium"
              onClick={onFollowUp}
            >
              <CalendarClock className="size-4" />
              Follow-up
            </Button>
            <Button
              variant="outline"
              className="h-10 text-[13px] gap-2 font-medium"
              onClick={onAssignBroker}
            >
              <UserCheck className="size-4" />
              Assign
            </Button>
            {canConvert ? (
              <Button
                className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 text-[13px] gap-2 font-medium"
                onClick={onConvert}
              >
                <CheckCircle2 className="size-4" />
                Convert
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-10 text-[13px] gap-2 font-medium text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={onArchive}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

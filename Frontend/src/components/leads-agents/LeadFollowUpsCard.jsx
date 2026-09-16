"use client";

import DetailCard from "@/components/common/DetailCard";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, CalendarClock } from "lucide-react";

/**
 * LeadFollowUpsCard
 *
 * API Integration Guidelines:
 * - Data source: `lead` row mapped from `GET /api/clients/{id}`
 *   - nextFollowUp: formatted from Client.nextFollowUpAt
 *   - followUpMethod: Client.followUpMethod (enum: "CALL", "EMAIL", "WHATSAPP", "SMS")
 *   - brokerName: Client.assignedBroker.name
 * - Action: `+ Add Follow-up` triggers ScheduleFollowUpDialog which executes
 *   `PATCH /api/clients/{id}` or `POST /api/clients/{id}/follow-up`
 */
export default function LeadFollowUpsCard({ lead, onAddFollowUp }) {
  const hasFollowUp = Boolean(lead?.nextFollowUp && lead.nextFollowUp !== "—");

  const followUpDate = lead?.nextFollowUp || "—";
  const followUpMethod =
    lead?.followUpMethod && lead.followUpMethod !== "—"
      ? lead.followUpMethod
      : "Follow-up";
  const brokerName =
    lead?.brokerName && lead.brokerName !== "—"
      ? lead.brokerName
      : "Unassigned";

  return (
    <DetailCard
      title="Follow-ups"
      action={
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[11px] sm:text-[12px] gap-1.5 font-medium cursor-pointer"
          onClick={onAddFollowUp}
        >
          <Plus className="size-3.5" />
          Add Follow-up
        </Button>
      }
    >
      {!hasFollowUp ? (
        <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border rounded-lg bg-white">
          <div className="size-8 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground mb-2">
            <CalendarClock className="size-4" />
          </div>
          <p className="font-montserrat font-semibold text-[13px] text-foreground">
            No upcoming follow-up
          </p>
          <p className="font-montserrat text-[11px] text-muted-foreground mt-0.5 max-w-xs">
            Schedule a follow-up call, email, or meeting to keep this lead moving forward.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-white shadow-sm hover:bg-muted/10 transition-colors">
          <div className="flex flex-col gap-0.5">
            <span className="font-montserrat font-semibold text-[13px] text-foreground">
              {followUpDate} · {followUpMethod}
            </span>
            <span className="font-montserrat text-[11px] text-muted-foreground">
              Assigned to {brokerName}
            </span>
          </div>
          <StatusBadge status="Upcoming" bordered />
        </div>
      )}
    </DetailCard>
  );
}

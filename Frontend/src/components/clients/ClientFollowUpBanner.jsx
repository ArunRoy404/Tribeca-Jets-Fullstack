"use client";

import { AlertTriangle, Calendar, Check, CalendarOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * The follow-up strip that sits under every client tab.
 *
 * It takes the client row and reads the real record, rather than accepting
 * date/note/status as props. It used to default them to "Aug 12, 2026" and a
 * note about a Miami -> New York round trip, and only the Overview tab passed
 * anything, so the other four showed that invented follow-up for every client
 * in the system — changing tabs changed the client's follow-up date.
 *
 * A client with nothing scheduled says so and offers to schedule one; it never
 * invents a date to fill the space.
 */
export default function ClientFollowUpBanner({
  client,
  onScheduleFollowUp,
  onMarkComplete,
  isCompleting = false,
}) {
  const scheduled = Boolean(client?.nextFollowUpAt);
  const date = scheduled ? client.nextFollowUpLabel : null;
  const note = scheduled ? client.followUpNote : "";
  const status =
    scheduled && client.followUpWindowLabel && client.followUpWindowLabel !== "—"
      ? client.followUpWindowLabel
      : null;

  // Overdue earns the alarm colour; anything else is informational.
  const overdue = client?.followUpWindow === "OVERDUE";
  const tone = overdue ? "destructive" : "warning";

  const wrapperTone = scheduled
    ? overdue
      ? "bg-destructive/5 border-destructive/30"
      : "bg-warning/5 border-warning/30"
    : "bg-secondary/30 border-border";

  const iconTone = scheduled
    ? overdue
      ? "bg-destructive/15 text-destructive"
      : "bg-warning/15 text-warning"
    : "bg-secondary text-muted-foreground";

  return (
    <div
      className={`p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full ${wrapperTone}`}
    >
      <div className="flex items-center gap-3">
        <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${iconTone}`}>
          {scheduled ? <AlertTriangle className="size-4.5" /> : <CalendarOff className="size-4.5" />}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-montserrat font-bold text-[13px] text-foreground">
              {scheduled ? `Follow-up: ${date}` : "No follow-up scheduled"}
            </span>
            {status && (
              <Badge tone={tone} size="sm" className="font-bold text-[10px]">
                {status}
              </Badge>
            )}
          </div>
          {note && (
            <p className="font-montserrat text-[11px] text-muted-foreground mt-0.5">
              {note}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none cursor-pointer"
          onClick={onScheduleFollowUp}
        >
          <Calendar className="size-3.5" />
          {scheduled ? "Reschedule" : "Schedule Follow-up"}
        </Button>
        {/* Nothing to complete when nothing is scheduled, so the button is not
            offered rather than offered and inert. */}
        {scheduled && (
          <Button
            variant="outline"
            size="sm"
            disabled={isCompleting}
            className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none cursor-pointer"
            onClick={onMarkComplete}
          >
            <Check className="size-3.5" />
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );
}

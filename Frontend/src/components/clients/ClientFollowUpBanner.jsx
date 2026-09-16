"use client";

import { AlertTriangle, Calendar, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ClientFollowUpBanner({
  date = "Aug 12, 2026",
  note = "Check availability for Miami → New York round trip in September",
  status = "Upcoming",
  onScheduleFollowUp,
  onMarkComplete,
}) {
  return (
    <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
          <AlertTriangle className="size-4.5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-montserrat font-bold text-[13px] text-foreground">
              Follow-up: {date}
            </span>
            <Badge tone="info" size="sm" className="font-bold text-[10px]">
              {status}
            </Badge>
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
          Schedule Follow-up
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none cursor-pointer"
          onClick={onMarkComplete}
        >
          <Check className="size-3.5" />
          Mark Complete
        </Button>
      </div>
    </div>
  );
}

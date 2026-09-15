"use client";

import {
  CheckCircle2,
  Plane,
  DollarSign,
  FileText,
  Mail,
  Calendar as CalendarIcon,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fullActivities = [
  {
    id: 1,
    user: "Barry",
    action: "confirmed TJ-1048 and sent final itinerary to Hope",
    time: "Aug 9 · 15:42",
    icon: <CheckCircle2 className="size-4" />,
    color: "bg-info/10 text-info",
  },
  {
    id: 2,
    user: "ExecuJet",
    action: "operator confirmation received for TJ-1048",
    time: "Aug 9 · 14:20",
    icon: <Plane className="size-4" />,
    color: "bg-purple/10 text-purple",
  },
  {
    id: 3,
    user: "Ari",
    action: "payment received — $42,500 cleared for TJ-1048",
    time: "Aug 8 · 17:35",
    icon: <DollarSign className="size-4" />,
    color: "bg-success/10 text-success",
  },
  {
    id: 4,
    user: "Barry",
    action: "sent round trip quote Q-2026-042 ($79,500)",
    time: "Aug 8 · 11:00",
    icon: <FileText className="size-4" />,
    color: "bg-warning/10 text-warning",
  },
  {
    id: 5,
    user: "Barry",
    action: "created operation TJ-1048 — Miami → Los Angeles",
    time: "Aug 6 · 09:15",
    icon: <Plane className="size-4" />,
    color: "bg-info/10 text-info",
  },
  {
    id: 6,
    user: "Hope",
    action: "replied confirming 4 passengers and catering request",
    time: "Aug 5 · 14:30",
    icon: <Mail className="size-4" />,
    color: "bg-purple/10 text-purple",
  },
  {
    id: 7,
    user: "Barry",
    action: "follow-up scheduled for Aug 12 — September routing",
    time: "Aug 4 · 10:00",
    icon: <CalendarIcon className="size-4" />,
    color: "bg-purple/10 text-purple",
  },
  {
    id: 8,
    user: "Barry",
    action: "created operation TJ-1039 — Teterboro + Miami",
    time: "Jun 20 · 09:00",
    icon: <Plane className="size-4" />,
    color: "bg-info/10 text-info",
  },
];

export default function ClientActivityTab({ onScheduleFollowUp }) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Activity Timeline Card */}
      <div className="flex flex-col gap-4 p-5 bg-white border border-border rounded-xl shadow-card w-full">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground border-b border-border/50 pb-3">
          Activity Log
        </h3>

        <div className="flex flex-col gap-4 relative pl-2">
          {fullActivities.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-3.5 relative">
              {idx < fullActivities.length - 1 && (
                <div className="absolute left-[15px] top-8 w-0.5 h-full bg-border/60 -z-0" />
              )}
              <div
                className={`size-8 rounded-full flex items-center justify-center shrink-0 z-10 ${item.color}`}
              >
                {item.icon}
              </div>
              <div className="flex flex-col min-w-0 pt-0.5">
                <p className="font-montserrat text-[13px] text-foreground leading-snug">
                  <span className="font-bold">{item.user}</span> {item.action}
                </p>
                <span className="font-montserrat text-[11px] text-muted-foreground mt-0.5">
                  {item.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up Banner Card */}
      <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <AlertTriangle className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-montserrat font-bold text-[13px] text-foreground">
                Follow-up: Aug 12, 2026
              </span>
              <Badge tone="info" size="sm" className="font-bold text-[10px]">
                Upcoming
              </Badge>
            </div>
            <p className="font-montserrat text-[11px] text-muted-foreground">
              Check availability for Miami → New York round trip in September
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none"
            onClick={onScheduleFollowUp}
          >
            <CalendarIcon className="size-3.5" />
            Schedule Follow-up
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px] gap-1.5 font-medium flex-1 sm:flex-none"
            onClick={() => alert("Marked follow-up as complete!")}
          >
            <Check className="size-3.5" />
            Mark Complete
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  CheckCircle2,
  Plane,
  DollarSign,
  FileText,
  Mail,
  Calendar,
} from "lucide-react";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";

// Hardcoded preview data — will be wired to real API endpoint once activity API is connected
const ACTIVITIES_PREVIEW = [
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
    icon: <Calendar className="size-4" />,
    color: "bg-purple/10 text-purple",
  },
  {
    id: 8,
    user: "Barry",
    action: "created operation TJ-1039 — Teterboro → Miami",
    time: "Jun 20 · 09:00",
    icon: <Plane className="size-4" />,
    color: "bg-info/10 text-info",
  },
];

export default function ClientActivityTab({ onScheduleFollowUp }) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Activity Timeline Card */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 bg-white border border-border rounded-lg shadow-card w-full">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground border-b border-border/50 pb-3">
          Activity Log
        </h3>

        <div className="flex flex-col gap-4 relative pl-2">
          {ACTIVITIES_PREVIEW.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-3.5 relative">
              {idx < ACTIVITIES_PREVIEW.length - 1 && (
                <div className="absolute left-[15px] top-8 w-0.5 h-full bg-border/60 -z-0" />
              )}
              <div
                className={`size-8 rounded-full flex items-center justify-center shrink-0 z-10 ${item.color}`}
              >
                {item.icon}
              </div>
              <div className="flex flex-col min-w-0 pt-0.5">
                <p className="font-montserrat text-[12px] sm:text-[13px] text-foreground leading-snug">
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
      <ClientFollowUpBanner onScheduleFollowUp={onScheduleFollowUp} />
    </div>
  );
}

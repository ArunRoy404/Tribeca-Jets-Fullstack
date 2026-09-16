"use client";

import { Activity } from "lucide-react";

/**
 * LeadActivityTimelineCard
 *
 * API Integration Guidelines:
 * - Data source: `GET /api/communications/activities?clientId={leadId}` or `GET /api/audit-logs?entityId={leadId}`
 * - Wire shape:
 *   - id: string
 *   - title: string (e.g. "Welcome email sent to client")
 *   - meta: string (e.g. "Aug 8, 2026 · 10:15 · Barry")
 *   - type: "INQUIRY" | "EMAIL" | "CALL" | "NOTE"
 *
 * Note: A complete interaction timeline arrives with the Communications module.
 * When empty, renders an honest empty state.
 */
export default function LeadActivityTimelineCard({ activities = [] }) {
  return (
    <div className="rounded-lg border border-border p-3.5 sm:p-4 bg-white flex flex-col gap-3 shadow-sm">
      <h4 className="font-montserrat font-bold text-[13px] text-foreground">
        Activity Timeline
      </h4>
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="size-8 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground mb-2">
            <Activity className="size-4" />
          </div>
          <p className="font-montserrat font-semibold text-[12px] text-foreground">
            No activity recorded
          </p>
          <p className="font-montserrat text-[11px] text-muted-foreground mt-0.5 max-w-xs">
            Interaction timelines will appear here once the Communications module is connected.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {activities.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-secondary/70 border border-border flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                <Activity className="size-3.5" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-montserrat font-semibold text-[12px] text-foreground leading-snug">
                  {item.title}
                </span>
                <span className="font-montserrat text-[11px] text-muted-foreground">
                  {item.meta}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

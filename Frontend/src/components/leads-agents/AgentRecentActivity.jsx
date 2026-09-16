"use client";

import DetailCard from "@/components/common/DetailCard";
import { Activity } from "lucide-react";

/**
 * AgentRecentActivity
 *
 * API Integration Guidelines:
 * - Data source: `GET /api/audit-logs?userId={agentId}&limit=10` or `GET /api/communications/activities?userId={agentId}`
 * - Expected item wire shape:
 *   - id: string
 *   - title: string (e.g. "Lead created from direct inquiry")
 *   - meta: string (e.g. "{Target Name} · {Date} · {Time}")
 *   - type: "EMAIL" | "CALL" | "LEAD_CREATED" | "NOTE"
 *
 * Note: A full activity feed arrives with the Communications and Audit modules.
 * When empty, renders an honest empty state.
 */
export default function AgentRecentActivity({ activities = [] }) {
  return (
    <DetailCard title="Recent Activity" className="h-full">
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white w-full">
          <div className="size-10 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground mb-3">
            <Activity className="size-5" />
          </div>
          <p className="font-montserrat font-bold text-[14px] text-foreground">
            No Recent Activity
          </p>
          <p className="font-montserrat text-[12px] text-muted-foreground mt-1 max-w-xs">
            Broker timeline and logging history will appear here once the Communications module is connected.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activities.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-secondary/60 border border-border flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                <Activity className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-montserrat font-semibold text-[13px] text-foreground leading-snug">
                  {item.title}
                </span>
                <span className="font-montserrat text-[11px] sm:text-[12px] text-muted-foreground">
                  {item.meta}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailCard>
  );
}

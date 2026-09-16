"use client";

import DetailCard from "@/components/common/DetailCard";
import { Activity } from "lucide-react";

const FIGMA_ACTIVITIES = [
  {
    id: "act-1",
    title: "Lead created from direct inquiry",
    meta: "Jonathan Reed · Aug 8, 2026 · 10:15",
  },
  {
    id: "act-2",
    title: "Welcome email sent to jonathan.reed@reedcapital.com",
    meta: "Jonathan Reed · Aug 8, 2026 · 11:00",
  },
  {
    id: "act-3",
    title: "Lead created — referral from Jonathan Reed",
    meta: "Marcus Webb · Aug 9, 2026 · 07:30",
  },
  {
    id: "act-4",
    title: "Follow-up email sent with company overview",
    meta: "Tyler Grant · Aug 7, 2026 · 09:30",
  },
  {
    id: "act-5",
    title: "Qualification call — budget and dates confirmed",
    meta: "Tyler Grant · Aug 8, 2026 · 11:00",
  },
];

export default function AgentRecentActivity({ activities = [] }) {
  const displayActivities =
    activities && activities.length > 0 ? activities : FIGMA_ACTIVITIES;

  return (
    <DetailCard title="Recent Activity" className="h-full">
      <div className="flex flex-col gap-4">
        {displayActivities.map((item) => (
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
    </DetailCard>
  );
}

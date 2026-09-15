"use client";

import { Activity, Clock } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";

export default function AgentRecentActivity({ activities = [] }) {
  return (
    <SectionCard title="Recent Activity" className="bg-white flex-1 min-w-0">
      <div className="flex flex-col gap-3.5 w-full">
        {activities.map((item) => (
          <div key={item.id} className="flex items-start gap-3 w-full">
            <div className="size-8 rounded-full bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border mt-0.5">
              <Activity className="size-4 text-purple" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1 border-b border-border/40 pb-3">
              <p className="font-montserrat font-semibold text-[13px] text-foreground leading-snug">
                {item.title}
              </p>
              <div className="flex items-center gap-1.5 font-montserrat text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{item.lead}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" />
                  <span>{item.timestamp}</span>
                </span>
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="p-6 text-center text-muted-foreground font-montserrat text-[13px]">
            No recent activity recorded.
          </div>
        )}
      </div>
    </SectionCard>
  );
}


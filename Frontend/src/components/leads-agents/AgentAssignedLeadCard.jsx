"use client";

import StatusBadge from "@/components/common/StatusBadge";

export default function AgentAssignedLeadCard({ lead }) {
  return (
    <div className="flex flex-col gap-2 p-3 w-full rounded-sm border border-border bg-white">
      <div className="flex items-center justify-between gap-2 w-full">
        <p className="font-montserrat font-semibold text-[13px] text-purple truncate">
          {lead?.name}
        </p>
        {lead?.stage ? <StatusBadge status={lead.stage} bordered /> : null}
      </div>
      <div className="flex items-center justify-between gap-3 w-full font-montserrat text-[12px]">
        <span className="text-muted-foreground truncate">{lead?.email}</span>
        <span className="font-semibold text-foreground whitespace-nowrap">
          {lead?.nextFollowUp}
        </span>
      </div>
    </div>
  );
}

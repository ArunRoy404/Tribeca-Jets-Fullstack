"use client";

import AgentAssignedLeadCard from "./AgentAssignedLeadCard";

export default function AgentAssignedLeadCardsContainer({ leads = [] }) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-md border border-border w-full">
        <p className="font-montserrat font-bold text-[14px] text-foreground">No Leads Assigned</p>
        <p className="font-montserrat text-[12px] text-muted-foreground mt-1">
          Leads assigned to this broker will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {leads.map((lead) => (
        <AgentAssignedLeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}

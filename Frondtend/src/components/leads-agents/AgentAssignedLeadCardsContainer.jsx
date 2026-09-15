"use client";

import AgentAssignedLeadCard from "./AgentAssignedLeadCard";

export default function AgentAssignedLeadCardsContainer({ leads, getRowActions }) {
  if (!leads || leads.length === 0) {
    return (
      <div className="lg:hidden flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-border">
        <p className="font-montserrat font-medium text-[14px] text-muted-foreground">
          No leads currently assigned.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:hidden flex flex-col gap-3 w-full">
      {leads.map((lead) => (
        <AgentAssignedLeadCard
          key={lead.id}
          lead={lead}
          actions={getRowActions ? getRowActions(lead) : []}
        />
      ))}
    </div>
  );
}


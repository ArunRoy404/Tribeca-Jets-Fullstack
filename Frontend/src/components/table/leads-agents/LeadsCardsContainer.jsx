"use client";

import LeadCard from "./LeadCard";

export default function LeadsCardsContainer({
  leads,
  getRowActions,
  onSelectLead,
  archived = false,
}) {
  return (
    <div className="flex flex-col gap-3 p-3 w-full">
      {leads?.map((lead) => (
        <LeadCard
          key={lead?.id}
          lead={lead}
          actions={getRowActions?.(lead)}
          onClick={() => onSelectLead?.(lead?.id)}
          archived={archived}
        />
      ))}
      {leads?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No leads match the current filters.
        </p>
      )}
    </div>
  );
}

"use client";

import LeadCard from "./LeadCard";

export default function LeadsCardsContainer({ items, getRowActions, onSelectLead }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <LeadCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectLead?.(item?.id)}
        />
      ))}
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No leads found matching search filters.
        </p>
      )}
    </div>
  );
}

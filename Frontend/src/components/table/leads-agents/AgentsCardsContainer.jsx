"use client";

import AgentCard from "./AgentCard";

export default function AgentsCardsContainer({ items, getRowActions, onSelectAgent }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <AgentCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectAgent?.(item?.id)}
        />
      ))}
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No agents found matching search filters.
        </p>
      )}
    </div>
  );
}

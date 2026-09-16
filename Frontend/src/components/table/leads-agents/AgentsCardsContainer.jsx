"use client";

import AgentCard from "./AgentCard";

export default function AgentsCardsContainer({ agents, getRowActions, onSelectAgent }) {
  return (
    <div className="flex flex-col gap-3 p-3 w-full">
      {agents?.map((agent) => (
        <AgentCard
          key={agent?.id}
          agent={agent}
          actions={getRowActions?.(agent)}
          onClick={() => onSelectAgent?.(agent?.id)}
        />
      ))}
      {agents?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No agents match the current filters.
        </p>
      )}
    </div>
  );
}

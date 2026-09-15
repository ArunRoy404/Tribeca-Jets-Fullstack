"use client";

import SourcingRequestCard from "./SourcingRequestCard";

export default function OperatorSourcingCardsContainer({
  requests,
  selected,
  onToggleRow,
  getRowActions,
  onSelectRequest,
}) {
  return (
    <div className="flex flex-col gap-3 p-3 w-full">
      {requests?.map((r) => (
        <SourcingRequestCard
          key={r?.id}
          request={r}
          selected={selected?.has?.(r?.id)}
          onToggleSelect={() => onToggleRow?.(r?.id)}
          actions={getRowActions?.(r)}
          onClick={() => onSelectRequest?.(r?.id)}
        />
      ))}
      {requests?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No sourcing requests match the current filters.
        </p>
      )}
    </div>
  );
}

"use client";

import TripRequestCard from "./TripRequestCard";

export default function TripRequestsCardsContainer({
  requests,
  selected,
  onToggleRow,
  getRowActions,
  onSelectRequest,
  archived = false,
  selectable = true,
}) {
  return (
    <div className="flex flex-col gap-3 p-3 w-full">
      {requests?.map((request) => (
        <TripRequestCard
          key={request?.id}
          request={request}
          selected={selected?.has?.(request?.id)}
          onToggleSelect={() => onToggleRow?.(request?.id)}
          actions={getRowActions?.(request)}
          onClick={() => onSelectRequest?.(request?.id)}
          archived={archived}
          selectable={selectable}
        />
      ))}
      {requests?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No trip requests match the current filters.
        </p>
      )}
    </div>
  );
}

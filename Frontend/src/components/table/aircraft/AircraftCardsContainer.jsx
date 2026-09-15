"use client";

import AircraftCard from "./AircraftCard";

export default function AircraftCardsContainer({
  aircraft,
  selected,
  onToggleRow,
  getRowActions,
  onSelectAircraft,
}) {
  return (
    <div className="flex flex-col gap-3 p-3 w-full">
      {aircraft?.map((ac) => (
        <AircraftCard
          key={ac?.id}
          aircraft={ac}
          selected={selected?.has?.(ac?.id)}
          onToggleSelect={() => onToggleRow?.(ac?.id)}
          actions={getRowActions?.(ac)}
          onClick={() => onSelectAircraft?.(ac?.id)}
        />
      ))}
      {aircraft?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No aircraft match the current filters.
        </p>
      )}
    </div>
  );
}

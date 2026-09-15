"use client";

import AirportCard from "./AirportCard";

export default function AirportsCardsContainer({
  airports,
  selected,
  onToggleRow,
  getRowActions,
  onSelectAirport,
}) {
  return (
    <div className="flex flex-col gap-3 p-3 w-full">
      {airports?.map((apt) => (
        <AirportCard
          key={apt?.id}
          airport={apt}
          selected={selected?.has?.(apt?.id)}
          onToggleSelect={() => onToggleRow?.(apt?.id)}
          actions={getRowActions?.(apt)}
          onClick={() => onSelectAirport?.(apt)}
        />
      ))}
      {airports?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No airports match the current search filters.
        </p>
      )}
    </div>
  );
}

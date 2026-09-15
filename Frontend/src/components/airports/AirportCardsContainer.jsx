"use client";

import AirportCard from "./AirportCard";

export default function AirportCardsContainer({
  airportsList,
  selected,
  onToggleRow,
  getRowActions,
  onSelectAirport,
}) {
  return (
    <div className="flex flex-col gap-2.5 p-3 w-full">
      {airportsList.map((apt) => (
        <AirportCard
          key={apt.id}
          airport={apt}
          selected={selected.has(apt.id)}
          onToggleSelect={() => onToggleRow(apt.id)}
          actions={getRowActions ? getRowActions(apt) : undefined}
          onClick={() => onSelectAirport(apt)}
        />
      ))}
      {airportsList.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
          No airports match the current filters.
        </p>
      )}
    </div>
  );
}

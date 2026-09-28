"use client";

import ItineraryCard from "./ItineraryCard";

export default function ItinerariesCardsContainer({
  items,
  getRowActions,
  onSelectItinerary,
  selected,
  onToggleRow,
  selectable = false,
  archived = false,
}) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <ItineraryCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectItinerary?.(item?.id)}
          selected={selected?.has?.(item?.id)}
          onToggleRow={onToggleRow}
          selectable={selectable}
          archived={archived}
        />
      ))}
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No itineraries found matching search filters.
        </p>
      )}
    </div>
  );
}

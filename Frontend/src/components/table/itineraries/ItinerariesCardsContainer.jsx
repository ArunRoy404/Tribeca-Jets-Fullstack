"use client";

import ItineraryCard from "./ItineraryCard";

export default function ItinerariesCardsContainer({ items, getRowActions, onSelectItinerary }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <ItineraryCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectItinerary?.(item?.id)}
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

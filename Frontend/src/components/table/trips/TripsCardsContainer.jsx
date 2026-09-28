"use client";

import TripCard from "@/components/table/upcoming-trips/TripCard";

/** The board below `lg`: one card per trip, the same actions as the table row. */
export default function TripsCardsContainer({ items, getActions, onItemClick }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <TripCard
          key={item?.id}
          id={item?.reference}
          client={item?.client}
          broker={item?.broker}
          route={item?.route}
          departure={item?.departure}
          returnDate={item?.returnDate !== "—" ? item?.returnDate : undefined}
          aircraft={item?.aircraft !== "—" ? item?.aircraft : undefined}
          operator={item?.operator !== "—" ? item?.operator : undefined}
          status={item?.status}
          fet={item?.fet}
          profit={item?.profit}
          actions={getActions?.(item)}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  );
}

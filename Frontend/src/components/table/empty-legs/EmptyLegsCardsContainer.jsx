"use client";

import EmptyLegCard from "./EmptyLegCard";

/** The board below `lg`: one card per leg, the same actions as the table row. */
export default function EmptyLegsCardsContainer({ items, getRowActions, onSelectLeg }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <EmptyLegCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectLeg?.(item?.id)}
        />
      ))}
    </div>
  );
}

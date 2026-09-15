"use client";

import EmptyLegCard from "./EmptyLegCard";

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
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No empty legs found matching search filters.
        </p>
      )}
    </div>
  );
}

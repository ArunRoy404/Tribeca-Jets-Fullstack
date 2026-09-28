"use client";

import CommissionCard from "./CommissionCard";

/** The board below `lg`: one card per commission, the same actions as the table row. */
export default function CommissionsCardsContainer({ items, getRowActions, onSelectCommission }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <CommissionCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectCommission?.(item?.id)}
        />
      ))}
    </div>
  );
}

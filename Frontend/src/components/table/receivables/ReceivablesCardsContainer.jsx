"use client";

import ReceivableCard from "./ReceivableCard";

/** The board below `lg`: one card per invoice, the same actions as the table row. */
export default function ReceivablesCardsContainer({ items, getRowActions, onSelectReceivable, archived = false }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <ReceivableCard
          key={item?.id}
          item={item}
          archived={archived}
          actions={getRowActions?.(item)}
          onClick={() => onSelectReceivable?.(item?.id)}
        />
      ))}
    </div>
  );
}

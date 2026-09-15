"use client";

import ReceivableCard from "./ReceivableCard";

export default function ReceivablesCardsContainer({ items, getRowActions, onSelectReceivable }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <ReceivableCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectReceivable?.(item?.id)}
        />
      ))}
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No receivable records found matching search filters.
        </p>
      )}
    </div>
  );
}

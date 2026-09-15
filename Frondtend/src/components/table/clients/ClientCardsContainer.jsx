"use client";

import ClientCard from "./ClientCard";

export default function ClientCardsContainer({ items, getRowActions, onSelectClient }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <ClientCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectClient?.(item)}
        />
      ))}
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No clients found matching search filters.
        </p>
      )}
    </div>
  );
}

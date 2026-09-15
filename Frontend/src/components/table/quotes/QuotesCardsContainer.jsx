"use client";

import QuoteCard from "./QuoteCard";

export default function QuotesCardsContainer({ items, getActions, onItemClick }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <QuoteCard
          key={item?.id}
          item={item}
          actions={getActions?.(item)}
          onClick={() => onItemClick?.(item)}
        />
      ))}
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No quotes found matching your filters.
        </p>
      )}
    </div>
  );
}

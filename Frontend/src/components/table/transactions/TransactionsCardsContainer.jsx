"use client";

import TransactionCard from "./TransactionCard";

export default function TransactionsCardsContainer({ items, getRowActions, onSelectTransaction }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <TransactionCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectTransaction?.(item?.id)}
        />
      ))}
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No transaction records found matching search filters.
        </p>
      )}
    </div>
  );
}

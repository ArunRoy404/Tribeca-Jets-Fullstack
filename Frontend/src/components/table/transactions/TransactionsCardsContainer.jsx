"use client";

import TransactionCard from "./TransactionCard";

/** The ledger below `lg`: one card per movement, opening the bill it settles. */
export default function TransactionsCardsContainer({ items, onOpen }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <TransactionCard key={item?.id} item={item} onClick={item?.href ? () => onOpen?.(item.href) : undefined} />
      ))}
    </div>
  );
}

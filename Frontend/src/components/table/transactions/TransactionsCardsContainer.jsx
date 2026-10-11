"use client";

import TransactionCard from "./TransactionCard";

/** The ledger below `lg`: one card per movement, opening the detail sheet drawer. */
export default function TransactionsCardsContainer({ items, onOpen }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <TransactionCard key={item?.id} item={item} onClick={() => onOpen?.(item)} />
      ))}
    </div>
  );
}

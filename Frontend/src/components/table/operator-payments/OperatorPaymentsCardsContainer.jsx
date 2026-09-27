"use client";

import OperatorPaymentCard from "./OperatorPaymentCard";

/** The board below `lg`: one card per bill, the same actions as the table row. */
export default function OperatorPaymentsCardsContainer({ items, getRowActions, onSelectBill, archived = false }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <OperatorPaymentCard
          key={item?.id}
          item={item}
          archived={archived}
          actions={getRowActions?.(item)}
          onClick={() => onSelectBill?.(item?.id)}
        />
      ))}
    </div>
  );
}

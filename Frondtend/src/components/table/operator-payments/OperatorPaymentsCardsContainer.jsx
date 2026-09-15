"use client";

import OperatorPaymentCard from "./OperatorPaymentCard";

export default function OperatorPaymentsCardsContainer({ items, getRowActions, onSelectPayment }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <OperatorPaymentCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectPayment?.(item?.id)}
        />
      ))}
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No operator payment records found matching search filters.
        </p>
      )}
    </div>
  );
}

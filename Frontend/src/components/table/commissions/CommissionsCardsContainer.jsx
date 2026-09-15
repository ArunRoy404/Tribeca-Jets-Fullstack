"use client";

import CommissionCard from "./CommissionCard";

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
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No commission records found matching search filters.
        </p>
      )}
    </div>
  );
}

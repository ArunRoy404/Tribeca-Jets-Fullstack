"use client";

import ClientCard from "./ClientCard";
import TableStatus from "@/components/table/common/TableStatus";

export default function ClientCardsContainer({
  items,
  getRowActions,
  onSelectClient,
  isLoading,
  error,
}) {
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
      {!items?.length && (
        <TableStatus
          isLoading={isLoading}
          error={error}
          isEmpty={!isLoading && !error}
          emptyMessage="No clients match these filters"
        />
      )}
    </div>
  );
}

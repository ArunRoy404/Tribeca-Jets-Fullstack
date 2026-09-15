"use client";

import EmptyLegCard from "./EmptyLegCard";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";

export default function EmptyLegCardsContainer({ getRowActions }) {
  const { getFilteredEmptyLegs, selectLeg, page } = useEmptyLegsStore();
  const filtered = getFilteredEmptyLegs();

  const pageSize = 5;
  const startIndex = (page - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  if (paginated.length === 0) {
    return (
      <div className="lg:hidden flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-border">
        <p className="font-montserrat font-medium text-[14px] text-muted-foreground">
          No empty legs found matching search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:hidden flex flex-col gap-3 w-full">
      {paginated.map((item) => (
        <EmptyLegCard
          key={item.id}
          item={item}
          actions={getRowActions ? getRowActions(item) : []}
          onClick={() => selectLeg(item.id)}
        />
      ))}
    </div>
  );
}

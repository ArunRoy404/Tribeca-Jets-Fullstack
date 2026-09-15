"use client";

import OperatorCard from "./OperatorCard";

export default function OperatorsCardsContainer({
  operators,
  selected,
  onToggleRow,
  getRowActions,
  onSelectOperator,
}) {
  return (
    <div className="flex flex-col gap-3 p-3 w-full">
      {operators?.map((op) => (
        <OperatorCard
          key={op?.id}
          operator={op}
          selected={selected?.has?.(op?.id)}
          onToggleSelect={() => onToggleRow?.(op?.id)}
          actions={getRowActions?.(op)}
          onClick={() => onSelectOperator?.(op?.id)}
        />
      ))}
      {operators?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No operators match the current filters.
        </p>
      )}
    </div>
  );
}

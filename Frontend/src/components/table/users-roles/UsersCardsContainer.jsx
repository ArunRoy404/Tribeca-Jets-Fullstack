"use client";

import UserCard from "./UserCard";
import TableStatus from "@/components/table/common/TableStatus";

export default function UsersCardsContainer({
  items,
  getRowActions,
  onSelectUser,
  isLoading,
  error,
}) {
  const hasRows = Boolean(items?.length);

  return (
    <div className="flex flex-col gap-3 w-full">
      {items?.map((item) => (
        <UserCard
          key={item?.id}
          item={item}
          actions={getRowActions?.(item)}
          onClick={() => onSelectUser?.(item?.id)}
        />
      ))}
      <TableStatus
        isLoading={isLoading}
        error={error}
        isEmpty={!hasRows && !isLoading && !error}
        emptyMessage="No team members found"
      />
    </div>
  );
}

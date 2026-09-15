"use client";

import UserCard from "./UserCard";

export default function UsersCardsContainer({ items, getRowActions, onSelectUser }) {
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
      {items?.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No team members found matching search filters.
        </p>
      )}
    </div>
  );
}

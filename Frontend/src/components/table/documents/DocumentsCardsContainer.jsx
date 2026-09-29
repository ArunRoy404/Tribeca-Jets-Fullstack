"use client";

import DocumentCard from "./DocumentCard";

export default function DocumentsCardsContainer({ docs, selected, onToggleRow, getRowActions, selectable = false, archived = false }) {
  return (
    <div className="lg:hidden flex flex-col gap-3 p-3 w-full">
      {docs?.map((doc) => (
        <DocumentCard
          key={doc?.id}
          doc={doc}
          selected={selected?.has(doc?.id)}
          onToggleSelect={() => onToggleRow?.(doc?.id)}
          actions={getRowActions ? getRowActions(doc) : []}
          selectable={selectable}
          archived={archived}
        />
      ))}
    </div>
  );
}

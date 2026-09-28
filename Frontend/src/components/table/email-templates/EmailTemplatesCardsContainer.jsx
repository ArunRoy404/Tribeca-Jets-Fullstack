"use client";

import EmailTemplateCard from "./EmailTemplateCard";

export default function EmailTemplatesCardsContainer({
  templates,
  selected,
  onToggleRow,
  getRowActions,
  onSelectTemplate,
  selectable = false,
  archived = false,
}) {
  return (
    <div className="lg:hidden flex flex-col gap-3 p-3 w-full">
      {templates?.map((t) => (
        <EmailTemplateCard
          key={t?.id}
          template={t}
          selected={selected?.has(t?.id)}
          onToggleSelect={() => onToggleRow?.(t?.id)}
          actions={getRowActions ? getRowActions(t) : []}
          onClick={onSelectTemplate ? () => onSelectTemplate?.(t?.id) : undefined}
          selectable={selectable}
          archived={archived}
        />
      ))}
    </div>
  );
}

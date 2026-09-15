"use client";

import EmailTemplateCard from "./EmailTemplateCard";

export default function EmailTemplatesCardsContainer({
  templates,
  selected,
  onToggleRow,
  getRowActions,
  onSelectTemplate,
}) {
  if (!templates || templates.length === 0) {
    return (
      <div className="lg:hidden flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-border">
        <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
          No email templates match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:hidden flex flex-col gap-3 p-3 w-full">
      {templates.map((t) => (
        <EmailTemplateCard
          key={t?.id}
          template={t}
          selected={selected?.has(t?.id)}
          onToggleSelect={() => onToggleRow?.(t?.id)}
          actions={getRowActions ? getRowActions(t) : []}
          onClick={onSelectTemplate ? () => onSelectTemplate?.(t?.id) : undefined}
        />
      ))}
    </div>
  );
}

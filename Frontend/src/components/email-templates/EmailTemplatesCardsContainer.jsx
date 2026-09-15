import EmailTemplateCard from "@/components/email-templates/EmailTemplateCard";

export default function EmailTemplatesCardsContainer({
  templates,
  selected,
  onToggleRow,
  getRowActions,
  onSelectTemplate,
}) {
  return (
    <div className="flex flex-col gap-3 p-4 w-full">
      {templates.map((t) => (
        <EmailTemplateCard
          key={t.id}
          template={t}
          selected={selected.has(t.id)}
          onToggleSelect={() => onToggleRow(t.id)}
          actions={getRowActions(t)}
          onClick={onSelectTemplate ? () => onSelectTemplate(t.id) : undefined}
        />
      ))}
      {templates.length === 0 && (
        <p className="p-6 text-center font-montserrat text-[12px] text-muted-foreground w-full">
          No email templates match the current filters.
        </p>
      )}
    </div>
  );
}

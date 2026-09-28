"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function EmailTemplatesTableRow({
  template,
  isSelected,
  onToggleSelect,
  onSelectTemplate,
  getRowActions,
  selectable = false,
  archived = false,
}) {
  if (!template) return null;

  return (
    <TableRow
      className="border-border cursor-pointer hover:bg-secondary/40 transition-colors"
      onClick={() => onSelectTemplate?.(template?.id)}
    >
      {selectable && (
        <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={Boolean(isSelected)}
            onCheckedChange={() => onToggleSelect?.(template?.id)}
            aria-label={`Select ${template?.name}`}
          />
        </TableCell>
      )}
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground">
        <div className="flex items-center gap-2">
          {template?.name}
          {template?.isRestored && <RestoredBadge at={template?.restoredAtLabel} by={template?.restoredByName} />}
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={template?.categoryLabel} bordered />
        </div>
      </TableCell>
      <TableCell
        className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-left max-w-[340px] truncate"
        title={template?.subject}
      >
        {template?.subject}
      </TableCell>
      {archived ? (
        <>
          <TableCell className="p-[10px] font-montserrat text-[12px] text-muted-foreground text-center whitespace-nowrap">
            {template?.deletedAtLabel}
          </TableCell>
          <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center whitespace-nowrap">
            {template?.deletedByName}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="p-[10px] text-center">
            <div className="flex justify-center">
              <StatusBadge status={template?.status} bordered />
            </div>
          </TableCell>
          <TableCell className="p-[10px] font-montserrat text-[12px] text-muted-foreground text-center whitespace-nowrap">
            {template?.lastUpdated}
          </TableCell>
        </>
      )}
      <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(template) ?? []} />
        </div>
      </TableCell>
    </TableRow>
  );
}

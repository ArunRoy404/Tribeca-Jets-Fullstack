"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function EmailTemplatesTableRow({
  template,
  isSelected,
  onToggleSelect,
  onSelectTemplate,
  getRowActions,
}) {
  if (!template) return null;

  return (
    <TableRow
      className="border-border cursor-pointer hover:bg-secondary/40 transition-colors"
      onClick={() => onSelectTemplate?.(template?.id)}
    >
      <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect?.(template?.id)} />
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground">
        {template?.name}
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={template?.category} bordered />
        </div>
      </TableCell>
      <TableCell
        className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-left max-w-[340px] truncate"
        title={template?.subject}
      >
        {template?.subject}
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={template?.status} bordered />
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(template) ?? []} />
        </div>
      </TableCell>
    </TableRow>
  );
}

"use client";

import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function OperatorSourcingTableRow({
  r,
  selected,
  onToggleRow,
  getRowActions,
  onSelectRequest,
  // Selection with no bulk action is a control that does nothing, so the
  // column is not rendered at all unless a caller opts in.
  selectable = false,
}) {
  return (
    <TableRow key={r?.id} className="border-border cursor-pointer" onClick={() => onSelectRequest?.(r?.id)}>
      {selectable && (
        <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={() => onToggleRow?.(r?.id)} />
        </TableCell>
      )}
      <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-purple">{r?.reference}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">{r?.client}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-ink text-center whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          {r?.from}
          <ArrowRight className="size-3" />
          {r?.to}
        </span>
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">{r?.departure}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">{r?.aircraftNeeded}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">{r?.operatorsContacted}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-center">{r?.responses}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-success text-center whitespace-nowrap">{r?.budget}</TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">{r?.deadline}</TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          {r?.stage && <StatusBadge status={r?.stage} bordered />}
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(r)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

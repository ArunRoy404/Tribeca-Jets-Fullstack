"use client";

import { Star } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function OperatorsTableRow({
  op,
  selected,
  onToggleRow,
  getRowActions,
  onSelectOperator,
}) {
  return (
    <TableRow key={op?.id} className="border-border cursor-pointer" onClick={() => onSelectOperator?.(op?.id)}>
      <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={() => onToggleRow?.(op?.id)} />
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-left">
        {op?.name}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">
        {op?.homeBase}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat text-[12px] text-foreground text-center whitespace-nowrap">
        <div className="flex flex-col items-center">
          <span className="font-bold">{op?.primaryContact}</span>
          <span className="text-[11px] text-muted-foreground">{op?.email}</span>
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex flex-wrap gap-1 justify-center max-w-[200px] mx-auto">
          {op?.aircraftTypes?.map((t) => (
            <span key={t} className="text-[10px] font-montserrat font-semibold bg-secondary border border-border px-1.5 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="inline-flex items-center gap-1 font-montserrat font-bold text-[12px] text-foreground">
          <Star className="size-3 text-amber-500 fill-amber-500" />
          <span>{op?.reliability}</span>
        </div>
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-center">
        {op?.totalTrips}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-success text-center whitespace-nowrap">
        {op?.totalPaid}
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          {op?.status && <StatusBadge status={op?.status} bordered />}
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(op)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

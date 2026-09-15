"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function AircraftTableRow({
  ac,
  selected,
  onToggleRow,
  getRowActions,
  onSelectAircraft,
}) {
  return (
    <TableRow key={ac?.id} className="border-border cursor-pointer" onClick={() => onSelectAircraft?.(ac?.id)}>
      <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={() => onToggleRow?.(ac?.id)} />
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-left">
        {ac?.tailNumber || ac?.tail}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">
        {ac?.model}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {ac?.category}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-purple text-center whitespace-nowrap">
        {ac?.operator}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">
        {ac?.capacity || ac?.pax} Pax
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">
        {ac?.rangeNm || ac?.range} NM
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {ac?.homeBase}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-center">
        {ac?.trips}
      </TableCell>
      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          {ac?.status && <StatusBadge status={ac?.status} bordered />}
        </div>
      </TableCell>
      <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(ac)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

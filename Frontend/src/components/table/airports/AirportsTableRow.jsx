"use client";

import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import RestoredBadge from "@/components/common/RestoredBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function AirportsTableRow({
  apt,
  selected,
  onToggleRow,
  getRowActions,
  onSelectAirport,
  archived = false,
}) {
  return (
    <TableRow key={apt?.id} className="border-border cursor-pointer" onClick={() => onSelectAirport?.(apt)}>
      <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={() => onToggleRow?.(apt?.id)} />
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-left whitespace-nowrap">
        {apt?.codes}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-left">
        <span className="inline-flex items-center gap-2">
          {apt?.name}
          {/* A record that was removed and brought back says so, for good. */}
          {apt?.isRestored ? (
            <RestoredBadge at={apt?.restoredAtLabel} by={apt?.restoredByName} />
          ) : null}
        </span>
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {apt?.city}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {apt?.country}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
        {archived ? apt?.deletedAtLabel : apt?.runwayLabel}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-purple text-center whitespace-nowrap">
        {archived ? apt?.deletedByName : apt?.assignedFbo}
      </TableCell>
      <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(apt)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

"use client";

import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function AirportsTableRow({
  apt,
  selected,
  onToggleRow,
  getRowActions,
  onSelectAirport,
}) {
  return (
    <TableRow key={apt?.id} className="border-border cursor-pointer" onClick={() => onSelectAirport?.(apt)}>
      <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={() => onToggleRow?.(apt?.id)} />
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-left whitespace-nowrap">
        {apt?.icao} / {apt?.iata}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-left">
        {apt?.name}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {apt?.city}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {apt?.country}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
        {apt?.runwayLength || apt?.longestRunway}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-purple text-center whitespace-nowrap">
        {apt?.assignedFbo || "Signature Flight Support"}
      </TableCell>
      <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(apt)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

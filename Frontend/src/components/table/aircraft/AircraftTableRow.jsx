"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import RestoredBadge from "@/components/common/RestoredBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function AircraftTableRow({
  ac,
  selected,
  onToggleRow,
  getRowActions,
  onSelectAircraft,
  archived = false,
  selectable = true,
}) {
  return (
    <TableRow key={ac?.id} className="border-border cursor-pointer" onClick={() => onSelectAircraft?.(ac?.id)}>
      {selectable ? (
        <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={() => onToggleRow?.(ac?.id)} />
        </TableCell>
      ) : null}
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-left">
        <span className="inline-flex items-center gap-2">
          {ac?.tailNumber}
          {/* A record that was removed and brought back says so, for good. */}
          {ac?.isRestored ? (
            <RestoredBadge at={ac?.restoredAtLabel} by={ac?.restoredByName} />
          ) : null}
        </span>
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
      {/* Every value below is already formatted by `toAircraftRow`, em dash
          included — no `||` fallback here, or the table starts inventing. */}
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">
        {ac?.maxPassengers}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">
        {ac?.range}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {archived ? ac?.deletedAtLabel : ac?.homeBase}
      </TableCell>
      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-center whitespace-nowrap">
        {archived ? ac?.deletedByName : ac?.totalTrips}
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

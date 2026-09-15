"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";

export default function FlightTrackingTableRow({ flight, onSelectFlight, getRowActions }) {
  if (!flight) return null;

  return (
    <TableRow
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectFlight?.(flight?.id)}
    >
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-purple text-center">
        {flight?.tripId}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-foreground text-center">
        {flight?.client}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground text-center">
        {flight?.tailNumber}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center">
        {flight?.aircraft}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-purple text-center">
        {flight?.operator}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground text-center whitespace-nowrap">
        {flight?.origin} <span className="text-muted-foreground font-normal">→</span> {flight?.destination}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
        {flight?.departureDate}
      </TableCell>
      <TableCell className="p-[12px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={flight?.flightStatus} bordered />
        </div>
      </TableCell>
      <TableCell className="p-[12px] text-center">
        <div className="flex justify-center">
          <StatusBadge status={flight?.tripStatus} bordered />
        </div>
      </TableCell>
      <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(flight) ?? []} />
        </div>
      </TableCell>
    </TableRow>
  );
}

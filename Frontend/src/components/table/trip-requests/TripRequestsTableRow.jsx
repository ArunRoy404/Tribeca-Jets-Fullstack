"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import RestoredBadge from "@/components/common/RestoredBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

/**
 * Every value here is already formatted by `toTripRequestRow`, em dash
 * included. No `||` fallback in this file, or the table starts inventing —
 * an enquiry taken over the phone legitimately has no route and no budget.
 */
export default function TripRequestsTableRow({
  request,
  selected,
  onToggleRow,
  getRowActions,
  onSelectRequest,
  archived = false,
  selectable = true,
}) {
  return (
    <TableRow
      className="border-border cursor-pointer"
      onClick={() => onSelectRequest?.(request?.id)}
    >
      {selectable ? (
        <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={() => onToggleRow?.(request?.id)} />
        </TableCell>
      ) : null}

      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-purple text-left whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          {request?.reference}
          {/* A record that was removed and brought back says so, for good. */}
          {request?.isRestored ? (
            <RestoredBadge at={request?.restoredAtLabel} by={request?.restoredByName} />
          ) : null}
        </span>
      </TableCell>

      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">
        <div className="flex flex-col items-center">
          <span>{request?.clientName}</span>
          {request?.clientCompany ? (
            <span className="font-normal text-[11px] text-muted-foreground">
              {request.clientCompany}
            </span>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {request?.route}
      </TableCell>

      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        <div className="flex flex-col items-center">
          <span>{request?.departureDate}</span>
          {/* A present return date is what makes it a round trip. */}
          {request?.isRoundTrip ? (
            <span className="font-normal text-[11px] text-muted-foreground">
              returns {request?.returnDate}
            </span>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center">
        {request?.passengers}
      </TableCell>

      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {request?.aircraftPreference ?? "—"}
      </TableCell>

      <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap">
        {request?.estimatedValue}
      </TableCell>

      {/* The archived view answers "who removed it and when" instead of who
          owns it and how it came in — neither means anything for a row that is
          no longer being worked. */}
      <TableCell className="p-[10px] font-montserrat font-semibold text-[12px] text-purple text-center whitespace-nowrap">
        {archived ? request?.deletedAtLabel : request?.brokerName}
      </TableCell>

      <TableCell className="p-[10px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {archived ? request?.deletedByName : request?.source}
      </TableCell>

      <TableCell className="p-[10px] text-center">
        <div className="flex justify-center">
          {request?.status ? <StatusBadge status={request.status} bordered /> : null}
        </div>
      </TableCell>

      <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(request)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

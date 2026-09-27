"use client";

import { ArrowRight, Check, X } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function ItinerariesTableRow({
  item,
  getRowActions,
  onSelectItinerary,
  selected,
  onToggleRow,
  selectable = false,
  archived = false,
}) {
  return (
    <TableRow
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectItinerary?.(item?.id)}
    >
      {selectable && (
        <TableCell className="p-[12px] w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={Boolean(selected)}
            onCheckedChange={() => onToggleRow?.(item?.id)}
            aria-label={`Select the itinerary for ${item?.tripReference}`}
          />
        </TableCell>
      )}
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-purple whitespace-nowrap">
        <div className="flex items-center gap-2">
          {item?.tripReference}
          {item?.isRestored && <RestoredBadge at={item?.restoredAt} by={item?.restoredByName} />}
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-foreground">
        {item?.client}
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 font-montserrat font-bold text-[11px] text-foreground">
          <span>{item?.originCode}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span>{item?.destinationCode}</span>
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.departure}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.passengerCount || "—"}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.aircraftTail}
      </TableCell>
      {archived ? (
        <>
          <TableCell className="p-[12px] font-montserrat text-[11px] text-muted-foreground text-center whitespace-nowrap">
            {item?.deletedAtLabel}
          </TableCell>
          <TableCell className="p-[12px] font-montserrat text-[11px] text-foreground text-center whitespace-nowrap">
            {item?.deletedByName}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="p-[12px] text-center whitespace-nowrap">
            <div className="flex items-center justify-center gap-1 font-montserrat font-bold text-[11px]">
              {item?.confirmed ? (
                <span className="flex items-center gap-1 text-success">
                  <Check className="size-3.5" /> Yes
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground/70">
                  <X className="size-3.5" /> No
                </span>
              )}
            </div>
          </TableCell>
          <TableCell className="p-[12px]">
            {item?.tripStatus && <StatusBadge status={item?.tripStatus} bordered />}
          </TableCell>
        </>
      )}
      <TableCell className="p-[12px]" onClick={(e) => e.stopPropagation()}>
        <RowActionsMenu items={getRowActions?.(item)} />
      </TableCell>
    </TableRow>
  );
}

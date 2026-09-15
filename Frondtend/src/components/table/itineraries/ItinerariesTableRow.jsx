"use client";

import { ArrowRight, Check, X } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";

export default function ItinerariesTableRow({ item, getRowActions, onSelectItinerary }) {
  const isConfirmed = item?.confirmed === "Yes";

  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectItinerary?.(item?.id)}
    >
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-purple whitespace-nowrap">
        {item?.id}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-foreground">
        {item?.client}
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 font-montserrat font-bold text-[11px] text-foreground">
          <span>{item?.from}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span>{item?.to}</span>
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.departure}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.passengersCount}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.tailNumber}
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1 font-montserrat font-bold text-[11px]">
          {isConfirmed ? (
            <span className="flex items-center gap-1 text-success">
              <Check className="size-3.5" /> Yes
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground/70">
              <X className="size-3.5" /> NO
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="p-[12px]">
        {item?.tripStatus && <StatusBadge status={item?.tripStatus} bordered />}
      </TableCell>
      <TableCell className="p-[12px]" onClick={(e) => e.stopPropagation()}>
        <RowActionsMenu items={getRowActions?.(item)} />
      </TableCell>
    </TableRow>
  );
}

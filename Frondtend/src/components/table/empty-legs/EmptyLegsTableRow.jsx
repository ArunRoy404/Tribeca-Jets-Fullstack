"use client";

import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";

export default function EmptyLegsTableRow({ item, getRowActions, onSelectLeg }) {
  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectLeg?.(item?.id)}
    >
      <TableCell className="p-[12px] font-montserrat font-bold text-[12px] text-purple">
        {item?.id}
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 font-montserrat font-bold text-[12px] text-foreground">
          <span>{item?.origin}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span>{item?.destination}</span>
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {item?.date}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {item?.aircraft}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-purple text-center whitespace-nowrap">
        {item?.operator}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[12px] text-success text-center whitespace-nowrap">
        {item?.price}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[12px] text-destructive text-center whitespace-nowrap">
        {item?.expiry}
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <Badge tone="success" size="sm" className="font-bold text-[10px]">
          {item?.matches} Matches
        </Badge>
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="flex justify-center">
          {item?.status && <StatusBadge status={item?.status} bordered />}
        </div>
      </TableCell>
      <TableCell
        className="p-[12px] text-center whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(item)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

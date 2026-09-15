"use client";

import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function LeadsTableRow({ item, getRowActions, onSelectLead }) {
  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectLead?.(item?.id)}
    >
      <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox className="translate-y-0.5" />
      </TableCell>
      <TableCell className="p-[12px] text-left">
        <div className="flex flex-col min-w-0">
          <span className="font-montserrat font-bold text-[12px] text-foreground truncate">
            {item?.name}
          </span>
          {item?.company && (
            <span className="font-montserrat text-[10px] text-muted-foreground truncate">
              {item?.company}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.email}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.phone}
      </TableCell>
      <TableCell className="p-[12px] text-center">
        {item?.source && <StatusBadge status={item?.source} bordered />}
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-1 font-montserrat font-semibold text-[11px] text-purple">
          <span>{item?.origin}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span>{item?.destination}</span>
        </div>
      </TableCell>
      <TableCell className="p-[12px] text-center">
        {item?.priority && <StatusBadge status={item?.priority} bordered />}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.broker}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.nextFollowUp}
      </TableCell>
      <TableCell className="p-[12px] text-center">
        <div className="flex justify-center">
          {item?.status && <StatusBadge status={item?.status} bordered />}
        </div>
      </TableCell>
      <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(item)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

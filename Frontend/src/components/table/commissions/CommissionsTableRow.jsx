"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function CommissionsTableRow({ item, getRowActions, onSelectCommission }) {
  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectCommission?.(item?.id)}
    >
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-foreground">
        {item?.recipient}
      </TableCell>
      <TableCell className="p-[12px]">
        <span
          className={cn(
            "font-montserrat font-medium text-[11px] px-2 py-0.5 rounded-md border whitespace-nowrap",
            item?.type === "CRM Client"
              ? "bg-[#eef2ff] text-[#6366f1] border-[#c7d2fe]/60"
              : "bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]"
          )}
        >
          {item?.type}
        </span>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[11px] text-purple">
        {item?.tripId}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-success whitespace-nowrap">
        {item?.amount}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground whitespace-nowrap">
        {item?.dated}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground">
        {item?.method}
      </TableCell>
      <TableCell className="p-[12px]">
        {item?.status && <StatusBadge status={item?.status} bordered />}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground">
        {item?.broker}
      </TableCell>
      <TableCell className="p-[12px]" onClick={(e) => e.stopPropagation()}>
        <RowActionsMenu items={getRowActions?.(item)} />
      </TableCell>
    </TableRow>
  );
}

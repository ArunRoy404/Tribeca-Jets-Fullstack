"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function UsersTableRow({ item, getRowActions, onSelectUser }) {
  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectUser?.(item?.id)}
    >
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-foreground">
        {item?.name}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-muted-foreground whitespace-nowrap">
        {item?.email}
      </TableCell>
      <TableCell className="p-[12px]">
        <span
          className={cn(
            "font-montserrat font-medium text-[11px] px-2 py-0.5 rounded-md border whitespace-nowrap",
            item?.role === "Admin"
              ? "bg-[#eef2ff] text-[#6366f1] border-[#c7d2fe]/60"
              : item?.role === "Assistant"
              ? "bg-[#dcfce7] text-[#16a34a] border-[#bbf7d0]/60"
              : "bg-[#e0f2fe] text-[#0284c7] border-[#bae6fd]/60"
          )}
        >
          {item?.role}
        </span>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground">
        {item?.permissionLevel}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-purple text-center">
        {item?.activeLeads}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-purple text-center">
        {item?.activeTrips}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center">
        {item?.conversionRate}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[11px] text-success whitespace-nowrap">
        {item?.revenue}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-muted-foreground whitespace-nowrap">
        {item?.lastLogin}
      </TableCell>
      <TableCell className="p-[12px]">
        {item?.status && <StatusBadge status={item?.status} bordered />}
      </TableCell>
      <TableCell className="p-[12px]" onClick={(e) => e.stopPropagation()}>
        <RowActionsMenu items={getRowActions?.(item)} />
      </TableCell>
    </TableRow>
  );
}

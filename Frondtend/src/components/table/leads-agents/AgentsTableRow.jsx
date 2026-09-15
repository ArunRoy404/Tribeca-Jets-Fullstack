"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

export default function AgentsTableRow({ item, getRowActions, onSelectAgent }) {
  const initials = (item?.name ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectAgent?.(item?.id)}
    >
      <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox className="translate-y-0.5" />
      </TableCell>
      <TableCell className="p-[12px] text-left">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-secondary text-foreground flex items-center justify-center font-montserrat font-bold text-[12px] border border-border shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-montserrat font-semibold text-[12px] text-foreground truncate">
              {item?.name}
            </span>
            {item?.company && (
              <span className="font-montserrat text-[10px] text-muted-foreground truncate">
                {item?.company}
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.email}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.phone}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center">
        {item?.activeLeads}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center">
        {item?.activeTrips}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center">
        {item?.conversionRate}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center">
        {item?.followUpsDue}
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

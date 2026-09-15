"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function ClientsTableRow({ item, getRowActions, onSelectClient }) {
  const initials = item?.name
    ?.split(" ")
    ?.map((n) => n?.[0])
    ?.join("") ?? "";

  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectClient?.(item)}
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
            <span className="font-montserrat font-bold text-[12px] text-foreground truncate">
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
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-info text-center whitespace-nowrap">
        {item?.type}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-normal text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.email}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-normal text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.phone}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
        {item?.prefAirports}
      </TableCell>
      <TableCell className="p-[12px] font-montserrat text-center whitespace-nowrap">
        <div className="flex flex-col items-center">
          <span className="font-bold text-[11px] text-purple">{item?.lastTripId}</span>
          <span className="text-[10px] text-muted-foreground">{item?.lastTripDate}</span>
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat text-center whitespace-nowrap">
        {item?.nextFollowUpDate ? (
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "font-medium text-[11px]",
                item?.nextFollowUpStatus === "Overdue"
                  ? "text-destructive"
                  : item?.nextFollowUpStatus === "Due Today"
                  ? "text-warning"
                  : "text-success"
              )}
            >
              • {item?.nextFollowUpDate}
            </span>
            <span className="text-[10px] text-muted-foreground">{item?.nextFollowUpStatus}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-[11px]">---</span>
        )}
      </TableCell>
      <TableCell className="p-[12px] text-center">
        <div className="flex justify-center">
          {item?.status && <StatusBadge status={item?.status} bordered />}
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center">
        {item?.broker}
      </TableCell>
      <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(item)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

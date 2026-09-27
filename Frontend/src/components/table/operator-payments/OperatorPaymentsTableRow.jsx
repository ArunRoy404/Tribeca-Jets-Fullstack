"use client";

import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const CELL = "p-3 font-montserrat text-[12px] whitespace-nowrap";

export default function OperatorPaymentsTableRow({
  item,
  getRowActions,
  onSelectBill,
  selected,
  onToggleRow,
  selectable = false,
  archived = false,
}) {
  return (
    <TableRow
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectBill?.(item?.id)}
    >
      {selectable && (
        <TableCell className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={Boolean(selected)}
            onCheckedChange={() => onToggleRow?.(item?.id)}
            aria-label={`Select bill ${item?.number}`}
          />
        </TableCell>
      )}
      <TableCell className={`${CELL} font-semibold text-info`}>
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2">
            {item?.number}
            {item?.isRestored && <RestoredBadge at={item?.restoredAt} by={item?.restoredByName} />}
          </span>
          {item?.operatorReference && (
            <span className="text-[11px] font-normal text-muted-foreground">Their ref {item.operatorReference}</span>
          )}
        </div>
      </TableCell>
      <TableCell className={`${CELL} font-semibold text-foreground`} onClick={(e) => e.stopPropagation()}>
        {item?.operatorId ? (
          <Link href={`/dashboard/operators/${item.operatorId}`} className="hover:underline">
            {item?.operator}
          </Link>
        ) : (
          item?.operator
        )}
      </TableCell>
      <TableCell className={CELL} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-0.5">
          {item?.tripId ? (
            <Link href={`/dashboard/trips/${item.tripId}`} className="font-semibold text-purple hover:underline">
              {item?.tripReference}
            </Link>
          ) : (
            <span>{item?.tripReference}</span>
          )}
          <span className="text-[11px] text-muted-foreground">{item?.tripDate}</span>
        </div>
      </TableCell>
      <TableCell className={`${CELL} font-bold text-foreground`}>{item?.total}</TableCell>
      <TableCell className={`${CELL} font-bold text-success`}>{item?.paid}</TableCell>
      <TableCell className={cn(CELL, "font-bold", item?.hasBalance ? "text-destructive" : "text-foreground")}>
        {item?.balance}
      </TableCell>
      {archived ? (
        <>
          <TableCell className={`${CELL} text-muted-foreground`}>{item?.deletedAtLabel}</TableCell>
          <TableCell className={`${CELL} text-foreground`}>{item?.deletedByName}</TableCell>
        </>
      ) : (
        <>
          <TableCell className={`${CELL} text-foreground`}>{item?.due}</TableCell>
          <TableCell className="p-3">
            <StatusBadge status={item?.state} bordered />
          </TableCell>
          <TableCell className={`${CELL} text-foreground`}>{item?.broker}</TableCell>
        </>
      )}
      <TableCell className="p-3" onClick={(e) => e.stopPropagation()}>
        <RowActionsMenu items={getRowActions?.(item)} />
      </TableCell>
    </TableRow>
  );
}

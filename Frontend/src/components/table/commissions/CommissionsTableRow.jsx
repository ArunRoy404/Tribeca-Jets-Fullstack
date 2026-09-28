"use client";

import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

const CELL = "p-[12px] font-montserrat text-[12px] whitespace-nowrap";

export default function CommissionsTableRow({
  item,
  getRowActions,
  onSelectCommission,
  selected,
  onToggleRow,
  selectable = false,
  archived = false,
}) {
  return (
    <TableRow
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectCommission?.(item?.id)}
    >
      {selectable && (
        <TableCell className="p-[12px] w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={Boolean(selected)}
            onCheckedChange={() => onToggleRow?.(item?.id)}
            aria-label={`Select commission ${item?.reference}`}
          />
        </TableCell>
      )}
      <TableCell className={`${CELL} font-semibold text-purple`}>
        <div className="flex items-center gap-2">
          {item?.reference}
          {item?.isRestored && <RestoredBadge at={item?.restoredAt} by={item?.restoredByName} />}
        </div>
      </TableCell>
      <TableCell className={`${CELL} font-semibold text-foreground`}>{item?.recipient}</TableCell>
      <TableCell className="p-[12px]">
        <StatusBadge status={item?.type} />
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
          <span className="text-[11px] text-muted-foreground">
            {item?.client} · {item?.tripDate}
          </span>
        </div>
      </TableCell>
      <TableCell className={`${CELL} text-muted-foreground`}>{item?.structure}</TableCell>
      <TableCell className={`${CELL} font-bold text-success`}>{item?.amount}</TableCell>
      {archived ? (
        <>
          <TableCell className={`${CELL} text-muted-foreground`}>{item?.deletedAtLabel}</TableCell>
          <TableCell className={`${CELL} text-foreground`}>{item?.deletedByName}</TableCell>
        </>
      ) : (
        <>
          <TableCell className={`${CELL} text-foreground`}>{item?.paidAt}</TableCell>
          <TableCell className={`${CELL} text-foreground`}>{item?.method}</TableCell>
          <TableCell className="p-[12px]">
            <StatusBadge status={item?.status} bordered />
          </TableCell>
          <TableCell className={`${CELL} text-foreground`}>{item?.broker}</TableCell>
        </>
      )}
      <TableCell className="p-[12px]" onClick={(e) => e.stopPropagation()}>
        <RowActionsMenu items={getRowActions?.(item)} />
      </TableCell>
    </TableRow>
  );
}

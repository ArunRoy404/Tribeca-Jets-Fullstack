"use client";

import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

const CELL = "p-[12px] font-montserrat text-[12px] text-center whitespace-nowrap";

export default function TripsTableRow({
  item,
  onSelectTrip,
  getRowActions,
  selected,
  onToggleRow,
  selectable = false,
  archived = false,
}) {
  return (
    <TableRow className="border-border cursor-pointer hover:bg-purple/5 transition-colors" onClick={() => onSelectTrip?.(item)}>
      {selectable && (
        <TableCell className="p-[12px] w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={Boolean(selected)}
            onCheckedChange={() => onToggleRow?.(item?.id)}
            aria-label={`Select trip ${item?.reference}`}
          />
        </TableCell>
      )}
      <TableCell className="p-[12px] font-montserrat font-semibold text-[13px] text-purple text-left whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/trips/${item?.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
            {item?.reference}
          </Link>
          {item?.isRestored && <RestoredBadge at={item?.restoredAt} by={item?.restoredByName} />}
        </div>
      </TableCell>
      <TableCell className="p-[12px] font-montserrat font-bold text-[13px] text-foreground text-left whitespace-nowrap">{item?.client}</TableCell>
      <TableCell className={`${CELL} font-semibold text-foreground`}>{item?.broker}</TableCell>
      <TableCell className={`${CELL} font-bold text-foreground`}>{item?.route}</TableCell>
      <TableCell className={`${CELL} text-muted-foreground`}>{item?.departure}</TableCell>
      <TableCell className={`${CELL} text-muted-foreground`}>{item?.returnDate}</TableCell>
      <TableCell className="p-[12px]">
        <div className="flex flex-col gap-0.5 font-montserrat text-[12px] whitespace-nowrap">
          <span className="font-medium text-foreground">{item?.aircraft}</span>
          <span className="text-purple">{item?.operator}</span>
        </div>
      </TableCell>
      {archived ? (
        <>
          <TableCell className={`${CELL} text-muted-foreground`}>{item?.deletedAtLabel}</TableCell>
          <TableCell className={`${CELL} text-foreground`}>{item?.deletedByName}</TableCell>
        </>
      ) : (
        <>
          <TableCell className="p-[12px] text-center">
            <div className="flex justify-center">
              <StatusBadge status={item?.status} bordered />
            </div>
          </TableCell>
          <TableCell className={`${CELL} text-muted-foreground`}>
            {item?.clientBilling?.known ? <StatusBadge status={item.clientPayment} bordered /> : item?.clientPayment}
          </TableCell>
          <TableCell className={`${CELL} text-muted-foreground`}>
            {item?.operatorBilling?.known ? <StatusBadge status={item.operatorPayment} bordered /> : item?.operatorPayment}
          </TableCell>
          <TableCell className={`${CELL} text-muted-foreground`}>{item?.fet}</TableCell>
          <TableCell className={`${CELL} font-semibold text-foreground`}>{item?.total}</TableCell>
          <TableCell className={`${CELL} font-bold text-success`}>{item?.profit}</TableCell>
        </>
      )}
      <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(item)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

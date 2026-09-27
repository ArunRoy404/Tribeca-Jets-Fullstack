"use client";

import Link from "next/link";
import StatusBadge from "@/components/common/StatusBadge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const CELL = "p-3 font-montserrat text-[12px] whitespace-nowrap";

/** One movement of money. Clicking it opens the bill it settles. */
export default function TransactionsTableRow({ item, onOpen }) {
  return (
    <TableRow
      className={cn("border-border transition-colors", item?.href && "cursor-pointer hover:bg-purple/5")}
      onClick={() => item?.href && onOpen?.(item.href)}
    >
      <TableCell className={`${CELL} font-semibold text-foreground`}>{item?.date}</TableCell>
      <TableCell className="p-3">
        <StatusBadge status={item?.kind} bordered />
      </TableCell>
      <TableCell className={`${CELL} font-semibold text-info`}>{item?.document}</TableCell>
      <TableCell className={`${CELL} font-semibold text-foreground`}>{item?.counterparty}</TableCell>
      <TableCell className={CELL} onClick={(e) => e.stopPropagation()}>
        {item?.tripId ? (
          <Link href={`/dashboard/trips/${item.tripId}`} className="font-semibold text-purple hover:underline">
            {item?.tripReference}
          </Link>
        ) : (
          item?.tripReference
        )}
      </TableCell>
      <TableCell
        className={cn(
          CELL,
          "font-bold",
          !item?.known ? "text-muted-foreground" : item?.incoming ? "text-success" : "text-destructive",
        )}
      >
        {item?.amount}
      </TableCell>
      <TableCell className={`${CELL} text-foreground`}>{item?.method}</TableCell>
      <TableCell className={`${CELL} text-muted-foreground`}>{item?.reference}</TableCell>
      <TableCell className={`${CELL} text-foreground`}>{item?.broker}</TableCell>
    </TableRow>
  );
}

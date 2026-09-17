"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function QuotesTableRow({
  item,
  getRowActions,
  onSelectQuote,
  selected,
  onToggleRow,
  selectable = false,
  archived = false,
}) {
  return (
    <TableRow
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectQuote?.(item)}
    >
      {selectable && (
        <TableCell className="p-[12px] w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={Boolean(selected)}
            onCheckedChange={() => onToggleRow?.(item?.id)}
            aria-label={`Select quote ${item?.reference}`}
          />
        </TableCell>
      )}

      <TableCell className="p-[12px] font-montserrat font-medium text-[13px] text-purple text-left whitespace-nowrap">
        <div className="flex items-center gap-2">
          {/* The link goes by id; the reference is what a person reads. */}
          <Link
            href={`/dashboard/quotes/${item?.id}`}
            className="hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {item?.reference}
          </Link>
          {item?.isRestored && (
            <RestoredBadge at={item?.restoredAt} by={item?.restoredByName} />
          )}
        </div>
      </TableCell>

      <TableCell className="p-[12px] font-montserrat font-bold text-[13px] text-foreground text-left whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span>{item?.client}</span>
          {item?.isVip && (
            <span className="px-1.5 rounded font-bold text-[9px] bg-warning/15 text-warning border border-warning/30">
              VIP
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
        {item?.broker}
      </TableCell>

      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 font-montserrat font-bold text-[12px] text-foreground">
          <span>{item?.origin}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span>{item?.destination}</span>
        </div>
      </TableCell>

      <TableCell className="p-[12px] font-montserrat text-[12px] text-muted-foreground text-center whitespace-nowrap">
        {item?.departure}
      </TableCell>

      <TableCell className="p-[12px] font-montserrat font-medium text-[12px] text-foreground text-center whitespace-nowrap">
        {item?.aircraft}
      </TableCell>

      <TableCell className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground text-center whitespace-nowrap">
        {item?.basePrice}
      </TableCell>

      {/* "Not charged" rather than "$0" on an exempt leg — the tax was not
          waived to zero, it does not apply. */}
      <TableCell className="p-[12px] font-montserrat text-[12px] text-muted-foreground text-center whitespace-nowrap">
        {item?.fet}
      </TableCell>

      <TableCell className="p-[12px] font-montserrat font-bold text-[13px] text-success text-center whitespace-nowrap">
        {item?.total}
      </TableCell>

      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
          {item?.version}
        </span>
      </TableCell>

      {archived ? (
        <>
          <TableCell className="p-[12px] font-montserrat text-[12px] text-muted-foreground text-center whitespace-nowrap">
            {item?.deletedAtLabel}
          </TableCell>
          <TableCell className="p-[12px] font-montserrat text-[12px] text-muted-foreground text-center whitespace-nowrap">
            {item?.deletedByName}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="p-[12px] text-center whitespace-nowrap">
            <div className="flex justify-center">
              <StatusBadge status={item?.status} bordered />
            </div>
          </TableCell>
          {/* An expired offer that still says "Sent" is the thing a broker
              chases by mistake, so the date carries the warning itself. */}
          <TableCell
            className={cn(
              "p-[12px] font-montserrat text-[12px] text-center whitespace-nowrap",
              item?.isExpired ? "text-destructive font-semibold" : "text-muted-foreground",
            )}
          >
            {item?.expiry}
          </TableCell>
        </>
      )}

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

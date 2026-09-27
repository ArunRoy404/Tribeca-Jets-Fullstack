"use client";

import { ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import EmptyLegMatchBadge from "@/components/empty-legs/EmptyLegMatchBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

const CELL = "p-[12px] font-montserrat text-[12px] text-center whitespace-nowrap";

export default function EmptyLegsTableRow({
  item,
  getRowActions,
  onSelectLeg,
  selected,
  onToggleRow,
  selectable = false,
  archived = false,
}) {
  return (
    <TableRow
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectLeg?.(item?.id)}
    >
      {selectable && (
        <TableCell className="p-[12px] w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={Boolean(selected)}
            onCheckedChange={() => onToggleRow?.(item?.id)}
            aria-label={`Select empty leg ${item?.reference}`}
          />
        </TableCell>
      )}
      <TableCell className="p-[12px] font-montserrat font-bold text-[12px] text-purple whitespace-nowrap">
        <div className="flex items-center gap-2">
          {item?.reference}
          {item?.isRestored && <RestoredBadge at={item?.restoredAt} by={item?.restoredByName} />}
        </div>
      </TableCell>
      <TableCell className="p-[12px] text-center whitespace-nowrap">
        <div className="inline-flex flex-col items-center gap-0.5">
          <div className="inline-flex items-center gap-1.5 font-montserrat font-bold text-[12px] text-foreground">
            <span>{item?.origin}</span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <span>{item?.destination}</span>
          </div>
          <span className="font-montserrat text-[11px] text-muted-foreground">
            {item?.originName} → {item?.destinationName}
          </span>
        </div>
      </TableCell>
      <TableCell className={`${CELL} font-medium text-foreground`}>{item?.date}</TableCell>
      <TableCell className="p-[12px] text-center">
        <div className="flex flex-col gap-0.5 font-montserrat text-[12px] whitespace-nowrap">
          <span className="font-medium text-foreground">{item?.aircraft}</span>
          <span className="text-purple">{item?.operator}</span>
        </div>
      </TableCell>
      <TableCell className={`${CELL} font-bold text-success`}>{item?.price}</TableCell>
      {archived ? (
        <>
          <TableCell className={`${CELL} text-muted-foreground`}>{item?.deletedAtLabel}</TableCell>
          <TableCell className={`${CELL} text-foreground`}>{item?.deletedByName}</TableCell>
        </>
      ) : (
        <>
          <TableCell className={`${CELL} ${item?.lapsed ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
            {item?.expiry}
          </TableCell>
          <TableCell className="p-[12px] text-center">
            <div className="flex justify-center">
              <EmptyLegMatchBadge count={item?.matchCount} dateCount={item?.dateMatchCount} />
            </div>
          </TableCell>
          <TableCell className="p-[12px] text-center">
            <div className="flex justify-center">
              <StatusBadge status={item?.status} bordered />
            </div>
          </TableCell>
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

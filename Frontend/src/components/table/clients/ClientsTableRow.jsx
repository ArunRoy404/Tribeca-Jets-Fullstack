"use client";

import StatusBadge from "@/components/common/StatusBadge";
import RestoredBadge from "@/components/common/RestoredBadge";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Overdue reads red, due today amber, upcoming green. */
const WINDOW_TONE = {
  OVERDUE: "text-destructive",
  TODAY: "text-warning",
  UPCOMING: "text-success",
};

export default function ClientsTableRow({
  item,
  selected,
  onToggleRow,
  getRowActions,
  onSelectClient,
  archived = false,
}) {
  const initials =
    item?.name
      ?.split(" ")
      ?.map((n) => n?.[0])
      ?.join("")
      ?.slice(0, 2) ?? "";

  return (
    <TableRow
      key={item?.id}
      className="border-border cursor-pointer hover:bg-purple/5 transition-colors"
      onClick={() => onSelectClient?.(item)}
    >
      <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          className="translate-y-0.5"
          checked={selected}
          onCheckedChange={() => onToggleRow?.(item?.id)}
        />
      </TableCell>

      <TableCell className="p-[12px] text-left">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-secondary text-foreground flex items-center justify-center font-montserrat font-bold text-[12px] border border-border shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="inline-flex items-center gap-2">
              <span className="font-montserrat font-bold text-[12px] text-foreground truncate">
                {item?.name}
              </span>
              {item?.isRestored ? (
                <RestoredBadge at={item?.restoredAtLabel} by={item?.restoredByName} />
              ) : null}
            </span>
            {item?.companyName ? (
              <span className="font-montserrat text-[10px] text-muted-foreground truncate">
                {item.companyName}
              </span>
            ) : null}
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
        {item?.homeAirport}
      </TableCell>

      {archived ? (
        <>
          <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
            {item?.deletedAtLabel}
          </TableCell>
          <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap">
            {item?.deletedByName}
          </TableCell>
        </>
      ) : (
        <>
          {/* Awaiting the trips module. The API sends nothing for this yet, so
              it reads as an em dash rather than a number nobody computed. */}
          <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-muted-foreground text-center whitespace-nowrap">
            —
          </TableCell>
          <TableCell className="p-[12px] font-montserrat text-center whitespace-nowrap">
            {item?.nextFollowUpAt ? (
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "font-medium text-[11px]",
                    WINDOW_TONE[item?.followUpWindow] ?? "text-foreground",
                  )}
                >
                  {item?.nextFollowUpLabel}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {item?.followUpWindowLabel}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-[11px]">—</span>
            )}
          </TableCell>
        </>
      )}

      <TableCell className="p-[12px] text-center">
        <div className="flex justify-center">
          {item?.status && <StatusBadge status={item?.status} bordered />}
        </div>
      </TableCell>

      {archived ? null : (
        <TableCell className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center">
          {item?.broker}
        </TableCell>
      )}

      <TableCell className="p-[12px] text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center">
          <RowActionsMenu items={getRowActions?.(item)} />
        </div>
      </TableCell>
    </TableRow>
  );
}

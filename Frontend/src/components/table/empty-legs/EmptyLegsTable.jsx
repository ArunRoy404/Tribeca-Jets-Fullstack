"use client";

import EmptyLegsTableRow from "./EmptyLegsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = ["Leg ID", "Route", "Departure", "Aircraft · Operator", "Price"];
/** The Archived tab swaps the offer's live columns for who removed it and when. */
const LIVE_TAIL = ["Expiry", "Matches", "Status", ""];
const ARCHIVED_TAIL = ["Removed On", "Removed By", ""];

export default function EmptyLegsTable({
  pageItems,
  getRowActions,
  onSelectLeg,
  selected,
  onToggleRow,
  onSelectAll,
  selectable = false,
  archived = false,
}) {
  const columns = [...BASE_COLUMNS, ...(archived ? ARCHIVED_TAIL : LIVE_TAIL)];

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {selectable && (
              <TableHead className="w-10 p-[12px]">
                <Checkbox
                  checked={selected?.size === pageItems?.length && pageItems?.length > 0}
                  onCheckedChange={onSelectAll}
                  aria-label="Select every empty leg on this page"
                />
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead
                key={`${col}-${idx}`}
                className={`p-[12px] font-montserrat font-semibold text-[12px] text-foreground whitespace-nowrap h-auto ${
                  idx === 0 ? "text-left" : "text-center"
                }`}
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems?.map((item) => (
            <EmptyLegsTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectLeg={onSelectLeg}
              selected={selected?.has?.(item?.id)}
              onToggleRow={onToggleRow}
              selectable={selectable}
              archived={archived}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

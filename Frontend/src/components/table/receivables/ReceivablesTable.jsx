"use client";

import ReceivablesTableRow from "./ReceivablesTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = ["Invoice", "Client", "Trip", "Total", "FET", "Paid", "Balance"];
/** The Archived tab swaps the collection columns for who removed it and when. */
const LIVE_TAIL = ["Due", "Status", "Broker", ""];
const ARCHIVED_TAIL = ["Removed On", "Removed By", ""];

export default function ReceivablesTable({
  pageItems,
  getRowActions,
  onSelectReceivable,
  selected,
  onToggleRow,
  onSelectAll,
  selectable = false,
  archived = false,
}) {
  const columns = [...BASE_COLUMNS, ...(archived ? ARCHIVED_TAIL : LIVE_TAIL)];

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-275">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {selectable && (
              <TableHead className="w-10 p-3">
                <Checkbox
                  checked={selected?.size === pageItems?.length && pageItems?.length > 0}
                  onCheckedChange={onSelectAll}
                  aria-label="Select every invoice on this page"
                />
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead
                key={`${col}-${idx}`}
                className="p-3 font-montserrat font-semibold text-[12px] text-foreground whitespace-nowrap h-auto text-left"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems?.map((item) => (
            <ReceivablesTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectReceivable={onSelectReceivable}
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

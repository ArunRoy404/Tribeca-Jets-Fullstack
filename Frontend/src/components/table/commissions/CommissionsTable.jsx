"use client";

import CommissionsTableRow from "./CommissionsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = ["ID", "Recipient", "Type", "Trip", "Structure", "Amount"];
/** The Archived tab swaps the payment columns for who removed it and when. */
const LIVE_TAIL = ["Paid On", "Method", "Status", "Broker", ""];
const ARCHIVED_TAIL = ["Removed On", "Removed By", ""];

export default function CommissionsTable({
  pageItems,
  getRowActions,
  onSelectCommission,
  selected,
  onToggleRow,
  onSelectAll,
  selectable = false,
  archived = false,
}) {
  const columns = [...BASE_COLUMNS, ...(archived ? ARCHIVED_TAIL : LIVE_TAIL)];

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {selectable && (
              <TableHead className="w-10 p-[12px]">
                <Checkbox
                  checked={selected?.size === pageItems?.length && pageItems?.length > 0}
                  onCheckedChange={onSelectAll}
                  aria-label="Select every commission on this page"
                />
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead
                key={`${col}-${idx}`}
                className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground whitespace-nowrap h-auto text-left"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems?.map((item) => (
            <CommissionsTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectCommission={onSelectCommission}
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

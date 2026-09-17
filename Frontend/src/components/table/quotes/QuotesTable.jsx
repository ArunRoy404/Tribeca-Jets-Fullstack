"use client";

import QuotesTableRow from "./QuotesTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = [
  "Quote ID",
  "Client",
  "Broker",
  "Route",
  "Departure",
  "Aircraft",
  "Base Price",
  "FET",
  "Total",
  "Version",
];

/**
 * The Archived tab swaps the two columns that mean nothing for a removed
 * record — its status and how long the offer stands — for who removed it and
 * when.
 */
const LIVE_TAIL = ["Status", "Valid Until", "Action"];
const ARCHIVED_TAIL = ["Removed On", "Removed By", "Action"];

export default function QuotesTable({
  pageItems,
  getRowActions,
  onSelectQuote,
  selected,
  onSelectAll,
  onToggleRow,
  selectable = false,
  archived = false,
}) {
  const columns = [...BASE_COLUMNS, ...(archived ? ARCHIVED_TAIL : LIVE_TAIL)];

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1200px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {selectable && (
              <TableHead className="w-10 p-[12px]">
                <Checkbox
                  checked={
                    selected?.size === pageItems?.length && pageItems?.length > 0
                  }
                  onCheckedChange={onSelectAll}
                  aria-label="Select every quote on this page"
                />
              </TableHead>
            )}
            {columns?.map((col, idx) => (
              <TableHead
                key={col}
                className={`p-[12px] font-montserrat font-semibold text-[12px] text-foreground whitespace-nowrap h-auto ${
                  idx < 2 ? "text-left" : "text-center"
                }`}
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems?.map((item) => (
            <QuotesTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectQuote={onSelectQuote}
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

"use client";

import TripsTableRow from "./TripsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = ["Trip ID", "Client", "Broker", "Route", "Departure", "Return", "Aircraft · Operator"];

/**
 * "Client Pmt" and "Op Pmt" stay as columns reading "—": payments are
 * Receivables (#16) and Operator Payments (#17), and an honest blank says the
 * data is not there yet where a missing column would say it does not matter.
 * The Archived tab swaps the lifecycle columns for who removed it and when.
 */
const LIVE_TAIL = ["Status", "Client Pmt", "Op Pmt", "FET", "Total", "Profit", ""];
const ARCHIVED_TAIL = ["Removed On", "Removed By", ""];

export default function TripsTable({
  pageItems,
  onSelectTrip,
  getRowActions,
  selected,
  onToggleRow,
  onSelectAll,
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
                  checked={selected?.size === pageItems?.length && pageItems?.length > 0}
                  onCheckedChange={onSelectAll}
                  aria-label="Select every trip on this page"
                />
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead
                key={`${col}-${idx}`}
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
            <TripsTableRow
              key={item?.id}
              item={item}
              onSelectTrip={onSelectTrip}
              getRowActions={getRowActions}
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

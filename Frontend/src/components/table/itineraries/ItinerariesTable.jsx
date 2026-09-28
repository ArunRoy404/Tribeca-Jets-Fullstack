"use client";

import ItinerariesTableRow from "./ItinerariesTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = ["Itinerary", "Client", "Route", "Departure", "Pax", "Tail #"];
/** The Archived tab swaps the live columns for who removed it and when. */
const LIVE_TAIL = ["Confirmed", "Trip Status", ""];
const ARCHIVED_TAIL = ["Removed On", "Removed By", ""];

export default function ItinerariesTable({
  pageItems,
  getRowActions,
  onSelectItinerary,
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
                  aria-label="Select every itinerary on this page"
                />
              </TableHead>
            )}
            {columns?.map((col, idx) => (
              <TableHead
                key={col || idx}
                className="p-[12px] font-montserrat font-medium text-[11px] text-foreground whitespace-nowrap h-auto"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems?.map((item) => (
            <ItinerariesTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectItinerary={onSelectItinerary}
              selected={selected?.has?.(item?.id)}
              onToggleRow={onToggleRow}
              selectable={selectable}
              archived={archived}
            />
          ))}
          {pageItems?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length + (selectable ? 1 : 0)} className="p-8 text-center font-montserrat text-[13px] text-muted-foreground">
                No itineraries found matching search filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

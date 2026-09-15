"use client";

import AircraftTableRow from "./AircraftTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Tail #",
  "Aircraft Model",
  "Category",
  "Operator",
  "Capacity",
  "Range",
  "Home Base",
  "Trips",
  "Status",
  "Action",
];

export default function AircraftTable({
  pageAircraft,
  selected,
  onSelectAll,
  onToggleRow,
  getRowActions,
  onSelectAircraft,
}) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="bg-black/10 border-border hover:bg-black/10">
            <TableHead className="w-10 p-[10px]">
              <Checkbox
                checked={selected?.size === pageAircraft?.length && pageAircraft?.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            {columns?.map((col) => (
              <TableHead key={col} className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap h-auto">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageAircraft?.map((ac) => (
            <AircraftTableRow
              key={ac?.id}
              ac={ac}
              selected={selected?.has?.(ac?.id)}
              onToggleRow={onToggleRow}
              getRowActions={getRowActions}
              onSelectAircraft={onSelectAircraft}
            />
          ))}
          {pageAircraft?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length + 1} className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
                No aircraft match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

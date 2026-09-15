"use client";

import AirportsTableRow from "./AirportsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "ICAO / IATA",
  "Airport Name",
  "City",
  "Country",
  "Longest Runway",
  "Assigned FBO",
  "Action",
];

export default function AirportsTable({
  pageAirports,
  selected,
  onSelectAll,
  onToggleRow,
  getRowActions,
  onSelectAirport,
}) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="bg-black/10 border-border hover:bg-black/10">
            <TableHead className="w-10 p-[10px]">
              <Checkbox
                checked={selected?.size === pageAirports?.length && pageAirports?.length > 0}
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
          {pageAirports?.map((apt) => (
            <AirportsTableRow
              key={apt?.id}
              apt={apt}
              selected={selected?.has?.(apt?.id)}
              onToggleRow={onToggleRow}
              getRowActions={getRowActions}
              onSelectAirport={onSelectAirport}
            />
          ))}
          {pageAirports?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length + 1} className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
                No airports match the current search filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

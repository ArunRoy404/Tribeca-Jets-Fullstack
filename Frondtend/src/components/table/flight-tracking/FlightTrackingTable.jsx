"use client";

import FlightTrackingTableRow from "./FlightTrackingTableRow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Trip ID",
  "Client",
  "Tail #",
  "Aircraft",
  "Operator",
  "Route",
  "Departure",
  "Flight Status",
  "Trip Status",
  "",
];

export default function FlightTrackingTable({ pageFlights, onSelectFlight, getRowActions }) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {columns.map((col, idx) => (
              <TableHead
                key={col || idx}
                className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap h-auto"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageFlights?.map((flight) => (
            <FlightTrackingTableRow
              key={flight?.id}
              flight={flight}
              onSelectFlight={onSelectFlight}
              getRowActions={getRowActions}
            />
          ))}
          {(!pageFlights || pageFlights.length === 0) && (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-8 text-center font-montserrat text-[13px] text-muted-foreground">
                No flight records match the specified filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

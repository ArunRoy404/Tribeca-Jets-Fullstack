"use client";

import QuotesTableRow from "./QuotesTableRow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Quote ID",
  "Client",
  "Broker",
  "Route",
  "Date",
  "Aircraft",
  "Base Price",
  "FET",
  "Total",
  "Flight Status",
  "Trip Status",
  "Action",
];

export default function QuotesTable({ pageItems, getRowActions, onSelectQuote }) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {columns?.map((col, idx) => (
              <TableHead
                key={col || idx}
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
            <QuotesTableRow key={item?.id} item={item} getRowActions={getRowActions} onSelectQuote={onSelectQuote} />
          ))}
          {pageItems?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns?.length}
                className="p-8 text-center font-montserrat text-[13px] text-muted-foreground"
              >
                No quotes found matching your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

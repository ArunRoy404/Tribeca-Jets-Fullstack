"use client";

import ReceivablesTableRow from "./ReceivablesTableRow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Client",
  "Trip",
  "Invoice",
  "Amount",
  "FET",
  "Paid",
  "Balance",
  "Due",
  "Status",
  "Broker",
  "Action",
];

export default function ReceivablesTable({ pageItems, getRowActions, onSelectReceivable }) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
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
            <ReceivablesTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectReceivable={onSelectReceivable}
            />
          ))}
          {pageItems?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length} className="p-8 text-center font-montserrat text-[13px] text-muted-foreground">
                No receivable records found matching search filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

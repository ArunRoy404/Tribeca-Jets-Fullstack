"use client";

import TransactionsTableRow from "./TransactionsTableRow";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLUMNS = ["Date", "Type", "Bill", "Client / Operator / Payee", "Trip", "Amount", "Method", "Reference", "Broker"];

/** The ledger at `lg` and up. Read-only: a row opens the bill it settles. */
export default function TransactionsTable({ pageItems, onOpen }) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-250">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {COLUMNS.map((col) => (
              <TableHead
                key={col}
                className="p-3 font-montserrat font-semibold text-[12px] text-foreground whitespace-nowrap h-auto text-left"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems?.map((item) => (
            <TransactionsTableRow key={item?.id} item={item} onOpen={onOpen} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

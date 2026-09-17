"use client";

import OperatorSourcingTableRow from "./OperatorSourcingTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Trip ID",
  "Client",
  "Route",
  "Departure",
  "Aircraft Needed",
  "Operators Contacted",
  "Responses",
  "Budget",
  "Deadline",
  "Status",
  "Action",
];

export default function OperatorSourcingTable({
  pageRequests,
  selected,
  onSelectAll,
  onToggleRow,
  getRowActions,
  onSelectRequest,
  // Opt-in, and off here: the board has no bulk action, and a checkbox column
  // with nothing to act on is a control that does nothing.
  selectable = false,
}) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="bg-black/10 border-border hover:bg-black/10">
            {selectable && (
              <TableHead className="w-10 p-[10px]">
                <Checkbox
                  checked={
                    selected?.size === pageRequests?.length &&
                    pageRequests?.length > 0
                  }
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
            )}
            {columns?.map((col) => (
              <TableHead key={col} className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap h-auto">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRequests?.map((r) => (
            <OperatorSourcingTableRow
              key={r?.id}
              r={r}
              selected={selected?.has?.(r?.id)}
              onToggleRow={onToggleRow}
              selectable={selectable}
              getRowActions={getRowActions}
              onSelectRequest={onSelectRequest}
            />
          ))}
          {pageRequests?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length + (selectable ? 1 : 0)} className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
                No sourcing requests match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

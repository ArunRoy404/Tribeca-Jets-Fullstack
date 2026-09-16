"use client";

import OperatorsTableRow from "./OperatorsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LIVE_COLUMNS = [
  "Operator",
  "Home Base",
  "Contact",
  "Aircraft Types",
  "Reliability",
  "Total Trips",
  "Total Paid",
  "Status",
  "Action",
];

/**
 * The archived view answers "who removed it and when" rather than "how good
 * are they", so the trip and payment aggregates give way to those two.
 */
const ARCHIVED_COLUMNS = [
  "Operator",
  "Home Base",
  "Contact",
  "Aircraft Types",
  "Reliability",
  "Removed On",
  "Removed By",
  "Status",
  "Action",
];

export default function OperatorsTable({
  pageOperators,
  selected,
  onSelectAll,
  onToggleRow,
  getRowActions,
  onSelectOperator,
  archived = false,
}) {
  const columns = archived ? ARCHIVED_COLUMNS : LIVE_COLUMNS;
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="bg-black/10 border-border hover:bg-black/10">
            <TableHead className="w-10 p-[10px]">
              <Checkbox
                checked={selected?.size === pageOperators?.length && pageOperators?.length > 0}
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
          {pageOperators?.map((op) => (
            <OperatorsTableRow
              key={op?.id}
              op={op}
              selected={selected?.has?.(op?.id)}
              onToggleRow={onToggleRow}
              getRowActions={getRowActions}
              onSelectOperator={onSelectOperator}
              archived={archived}
            />
          ))}
          {pageOperators?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length + 1} className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
                No operators match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

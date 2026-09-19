"use client";

import TripRequestsTableRow from "./TripRequestsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LIVE_COLUMNS = [
  "Request",
  "Client",
  "Route",
  "Departure",
  "Pax",
  "Aircraft",
  "Budget",
  "Broker",
  "Source",
  "Status",
  "Action",
];

/**
 * The archived view swaps the two columns that mean nothing for a row nobody
 * is working: who owns it, and how it came in.
 */
const ARCHIVED_COLUMNS = [
  "Request",
  "Client",
  "Route",
  "Departure",
  "Pax",
  "Aircraft",
  "Budget",
  "Removed On",
  "Removed By",
  "Status",
  "Action",
];

export default function TripRequestsTable({
  pageRequests,
  selected,
  onSelectAll,
  onToggleRow,
  getRowActions,
  onSelectRequest,
  archived = false,
  selectable = true,
}) {
  const columns = archived ? ARCHIVED_COLUMNS : LIVE_COLUMNS;

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1200px]">
        <TableHeader>
          <TableRow className="bg-black/10 border-border hover:bg-black/10">
            {/* No column at all for a role that cannot act on a selection —
                a checkbox whose only button is hidden is a control that does
                nothing. */}
            {selectable ? (
              <TableHead className="w-10 p-[10px]">
                <Checkbox
                  checked={
                    selected?.size === pageRequests?.length && pageRequests?.length > 0
                  }
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
            ) : null}
            {columns?.map((col) => (
              <TableHead
                key={col}
                className="p-[10px] font-montserrat font-bold text-[12px] text-foreground text-center whitespace-nowrap h-auto"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRequests?.map((request) => (
            <TripRequestsTableRow
              key={request?.id}
              request={request}
              selected={selected?.has?.(request?.id)}
              onToggleRow={onToggleRow}
              getRowActions={getRowActions}
              onSelectRequest={onSelectRequest}
              archived={archived}
              selectable={selectable}
            />
          ))}
          {pageRequests?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns?.length + (selectable ? 1 : 0)}
                className="p-6 text-center font-montserrat text-[12px] text-muted-foreground"
              >
                No trip requests match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

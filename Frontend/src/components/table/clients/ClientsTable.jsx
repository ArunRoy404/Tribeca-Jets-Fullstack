"use client";

import ClientsTableRow from "./ClientsTableRow";
import TableStatus from "@/components/table/common/TableStatus";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LIVE_COLUMNS = [
  "Client",
  "Type",
  "Email",
  "Phone",
  "Home Airport",
  "Last Trip",
  "Next Follow-up",
  "Status",
  "Broker",
  "Action",
];

/**
 * The archived view answers "who removed this and when". Follow-up and broker
 * say nothing about a client nobody is working any more.
 */
const ARCHIVED_COLUMNS = [
  "Client",
  "Type",
  "Email",
  "Phone",
  "Home Airport",
  "Removed On",
  "Removed By",
  "Status",
  "Action",
];

export default function ClientsTable({
  pageItems,
  selected,
  onSelectAll,
  onToggleRow,
  getRowActions,
  onSelectClient,
  isLoading,
  error,
  onRetry,
  archived = false,
}) {
  const columns = archived ? ARCHIVED_COLUMNS : LIVE_COLUMNS;
  const hasRows = Boolean(pageItems?.length);

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            <TableHead className="w-10 p-[12px]">
              <Checkbox
                className="translate-y-0.5"
                checked={
                  selected?.size === pageItems?.length && pageItems?.length > 0
                }
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            {columns?.map((col, idx) => (
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
          {pageItems?.map((item) => (
            <ClientsTableRow
              key={item?.id}
              item={item}
              selected={selected?.has?.(item?.id)}
              onToggleRow={onToggleRow}
              getRowActions={getRowActions}
              onSelectClient={onSelectClient}
              archived={archived}
            />
          ))}
          {!hasRows && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length + 1} className="p-0">
                <TableStatus
                  isLoading={isLoading}
                  error={error}
                  onRetry={onRetry}
                  isEmpty={!isLoading && !error}
                  emptyMessage={
                    archived ? "Nothing archived" : "No clients match these filters"
                  }
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

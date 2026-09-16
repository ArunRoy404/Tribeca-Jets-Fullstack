"use client";

import LeadsTableRow from "./LeadsTableRow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LIVE_COLUMNS = [
  "Lead Name",
  "Email",
  "Phone",
  "Source",
  "Route",
  "Priority",
  "Broker",
  "Next Follow-up",
  "Stage",
  "Action",
];

/**
 * The archived view answers "who removed it and when" rather than "what is the
 * next move", so the follow-up columns give way to those two.
 */
const ARCHIVED_COLUMNS = [
  "Lead Name",
  "Email",
  "Phone",
  "Source",
  "Route",
  "Priority",
  "Removed On",
  "Removed By",
  "Stage",
  "Action",
];

export default function LeadsTable({
  pageItems,
  getRowActions,
  onSelectLead,
  archived = false,
}) {
  const columns = archived ? ARCHIVED_COLUMNS : LIVE_COLUMNS;

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1150px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
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
          {pageItems?.map((lead) => (
            <LeadsTableRow
              key={lead?.id}
              lead={lead}
              getRowActions={getRowActions}
              onSelectLead={onSelectLead}
              archived={archived}
            />
          ))}
          {pageItems?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns?.length}
                className="p-6 text-center font-montserrat text-[12px] text-muted-foreground"
              >
                No leads match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

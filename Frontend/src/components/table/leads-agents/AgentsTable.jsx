"use client";

import AgentsTableRow from "./AgentsTableRow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * The Agents roster.
 *
 * "Agents" here means the desk's own brokers — travel agents are clients of
 * type TRAVEL_AGENT and live in the client directory.
 *
 * There is no checkbox column and no Add button, deliberately: this is a view
 * over Users, and staff are invited through Users & Roles where the permission
 * matrix and the suspend rules live. Two create forms for one kind of record
 * drift apart.
 */
const columns = [
  "Agent",
  "Email",
  "Phone",
  "Active Leads",
  "Converted",
  "Active Trips",
  "Conversion",
  "Follow-ups Due",
  "Status",
  "Action",
];

export default function AgentsTable({ pageItems, getRowActions, onSelectAgent }) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1100px]">
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
          {pageItems?.map((agent) => (
            <AgentsTableRow
              key={agent?.id}
              agent={agent}
              getRowActions={getRowActions}
              onSelectAgent={onSelectAgent}
            />
          ))}
          {pageItems?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns?.length}
                className="p-6 text-center font-montserrat text-[12px] text-muted-foreground"
              >
                No agents match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

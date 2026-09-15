"use client";

import AgentsTableRow from "./AgentsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "",
  "Agent",
  "Email",
  "Phone",
  "Active Leads",
  "Active Trips",
  "Conversion Rate",
  "Follow-ups Due",
  "Status",
  "Next Action",
];

export default function AgentsTable({ pageItems, getRowActions, onSelectAgent }) {
  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {columns?.map((col, idx) => (
              <TableHead
                key={col || idx}
                className="p-[12px] font-montserrat font-medium text-[11px] text-foreground text-center whitespace-nowrap h-auto"
              >
                {col === "" ? <Checkbox className="translate-y-0.5" /> : col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems?.map((item) => (
            <AgentsTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectAgent={onSelectAgent}
            />
          ))}
          {pageItems?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length} className="p-8 text-center font-montserrat text-[13px] text-muted-foreground">
                No agents found matching search filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

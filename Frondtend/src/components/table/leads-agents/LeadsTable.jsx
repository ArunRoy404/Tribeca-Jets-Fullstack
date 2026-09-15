"use client";

import LeadsTableRow from "./LeadsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "",
  "Lead Name",
  "Email",
  "Phone",
  "Source",
  "Route",
  "Priority",
  "Broker",
  "Next Follow-up",
  "Status",
  "Next Action",
];

export default function LeadsTable({ pageItems, getRowActions, onSelectLead }) {
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
            <LeadsTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectLead={onSelectLead}
            />
          ))}
          {pageItems?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length} className="p-8 text-center font-montserrat text-[13px] text-muted-foreground">
                No leads found matching search filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

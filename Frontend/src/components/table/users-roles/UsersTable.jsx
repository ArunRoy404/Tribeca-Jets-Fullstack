"use client";

import UsersTableRow from "./UsersTableRow";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "User",
  "Email",
  "Role",
  "Permission",
  "Leads",
  "Trips",
  "Conv. Rate",
  "Revenue",
  "Last Login",
  "Status",
  "Action",
];

export default function UsersTable({ pageItems, getRowActions, onSelectUser }) {
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
            <UsersTableRow
              key={item?.id}
              item={item}
              getRowActions={getRowActions}
              onSelectUser={onSelectUser}
            />
          ))}
          {pageItems?.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns?.length} className="p-8 text-center font-montserrat text-[13px] text-muted-foreground">
                No team members found matching search filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

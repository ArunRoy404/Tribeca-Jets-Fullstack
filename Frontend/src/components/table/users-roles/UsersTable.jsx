"use client";

import UsersTableRow from "./UsersTableRow";
import TableStatus from "@/components/table/common/TableStatus";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLUMNS = [
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

export default function UsersTable({
  pageItems,
  getRowActions,
  onSelectUser,
  isLoading,
  error,
}) {
  const columns = COLUMNS;
  const hasRows = Boolean(pageItems?.length);
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
          {!hasRows && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns?.length} className="p-0">
                <TableStatus
                  isLoading={isLoading}
                  error={error}
                  isEmpty={!isLoading && !error}
                  emptyMessage="No team members found"
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

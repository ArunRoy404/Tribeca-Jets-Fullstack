"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function ReportTable({ columns, rows, rowKey }) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full min-w-[420px]">
        <TableHeader>
          <TableRow className="bg-black/10 hover:bg-black/10">
            {columns?.map((col) => (
              <TableHead
                key={col?.key}
                className={cn(
                  "px-2.5 py-2.5 font-montserrat font-medium text-[12px] text-foreground whitespace-nowrap h-auto",
                  col?.align === "right" ? "text-right" : "text-left"
                )}
              >
                {col?.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows?.map((row, i) => (
            <TableRow key={rowKey ? rowKey(row, i) : i} className="border-b border-border last:border-b-0">
              {columns?.map((col) => (
                <TableCell
                  key={col?.key}
                  className={cn(
                    "px-2.5 py-2.5 font-montserrat font-medium text-[12px] whitespace-nowrap",
                    col?.align === "right" ? "text-right" : "text-left",
                    col?.cellClassName?.(row) ?? "text-foreground"
                  )}
                >
                  {col?.render ? col?.render(row) : row?.[col?.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

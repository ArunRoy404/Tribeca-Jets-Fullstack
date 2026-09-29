"use client";

import DocumentsTableRow from "./DocumentsTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = ["Title", "Category", "Folder", "Expires", "File"];
/** The Archived tab swaps who filed it for who removed it and when. */
const LIVE_TAIL = ["Filed", "Action"];
const ARCHIVED_TAIL = ["Removed On", "Removed By", "Action"];
const LEFT = new Set(["Title", "Folder", "File"]);

export default function DocumentsTable({ docs, selected, onToggleRow, onSelectAll, getRowActions, selectable = false, archived = false }) {
  const columns = [...BASE_COLUMNS, ...(archived ? ARCHIVED_TAIL : LIVE_TAIL)];
  const isAllSelected = selected?.size === docs?.length && (docs?.length ?? 0) > 0;

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {selectable && (
              <TableHead className="w-10 p-[10px]">
                <Checkbox checked={isAllSelected} onCheckedChange={() => onSelectAll?.()} aria-label="Select every document on this page" />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col}
                className={`p-[10px] font-montserrat font-bold text-[12px] text-foreground whitespace-nowrap h-auto ${
                  LEFT.has(col) ? "text-left" : "text-center"
                }`}
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs?.map((doc) => (
            <DocumentsTableRow
              key={doc?.id}
              doc={doc}
              isSelected={selected?.has(doc?.id)}
              onToggleSelect={onToggleRow}
              getRowActions={getRowActions}
              selectable={selectable}
              archived={archived}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

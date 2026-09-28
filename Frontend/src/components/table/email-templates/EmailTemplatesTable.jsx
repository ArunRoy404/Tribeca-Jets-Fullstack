"use client";

import EmailTemplatesTableRow from "./EmailTemplatesTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_COLUMNS = ["Template Name", "Category", "Subject"];
/** The Archived tab swaps the live columns for who removed it and when. */
const LIVE_TAIL = ["Active", "Last Updated", "Action"];
const ARCHIVED_TAIL = ["Removed On", "Removed By", "Action"];

export default function EmailTemplatesTable({
  pageTemplates,
  selected,
  onToggleRow,
  onSelectAll,
  onSelectTemplate,
  getRowActions,
  selectable = false,
  archived = false,
}) {
  const columns = [...BASE_COLUMNS, ...(archived ? ARCHIVED_TAIL : LIVE_TAIL)];
  const isAllSelected = selected?.size === pageTemplates?.length && (pageTemplates?.length ?? 0) > 0;

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            {selectable && (
              <TableHead className="w-10 p-[10px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={() => onSelectAll?.()}
                  aria-label="Select every template on this page"
                />
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead
                key={col}
                className={`p-[10px] font-montserrat font-bold text-[12px] text-foreground whitespace-nowrap h-auto ${
                  idx === 0 || idx === 2 ? "text-left" : "text-center"
                }`}
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageTemplates?.map((template) => (
            <EmailTemplatesTableRow
              key={template?.id}
              template={template}
              isSelected={selected?.has(template?.id)}
              onToggleSelect={onToggleRow}
              onSelectTemplate={onSelectTemplate}
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

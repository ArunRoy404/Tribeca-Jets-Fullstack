"use client";

import EmailTemplatesTableRow from "./EmailTemplatesTableRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Template Name",
  "Category",
  "Subject",
  "Active",
  "Action",
];

export default function EmailTemplatesTable({
  pageTemplates,
  selected,
  onToggleRow,
  onSelectAll,
  onSelectTemplate,
  getRowActions,
}) {
  const isAllSelected = selected?.size === pageTemplates?.length && (pageTemplates?.length ?? 0) > 0;

  return (
    <div className="relative w-full overflow-x-auto hidden lg:block">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="bg-black/5 border-border hover:bg-black/5">
            <TableHead className="w-10 p-[10px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={() => onSelectAll?.()}
              />
            </TableHead>
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
            />
          ))}
          {(!pageTemplates || pageTemplates.length === 0) && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
                No email templates match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

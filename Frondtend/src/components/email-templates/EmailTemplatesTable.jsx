"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Mail, Eye, Edit2, Trash2 } from "lucide-react";
import { useEmailTemplatesStore, EMAIL_TEMPLATES_PAGE_SIZE } from "@/store/useEmailTemplatesStore";
import { templateStatusOptions, templateCategoryOptions } from "@/dummyData/emailTemplates";
import StatusBadge from "@/components/common/StatusBadge";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import TablePagination from "@/components/table/common/TablePagination";
import RowActionsMenu from "@/components/table/common/RowActionsMenu";
import EmailTemplatesCardsContainer from "@/components/email-templates/EmailTemplatesCardsContainer";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const columns = [
  "Template Name",
  "Category",
  "Subject",
  "Active",
  "Action",
];

export default function EmailTemplatesTable() {
  const templates = useEmailTemplatesStore((s) => s.templates);
  const search = useEmailTemplatesStore((s) => s.search);
  const setSearch = useEmailTemplatesStore((s) => s.setSearch);
  const statusFilter = useEmailTemplatesStore((s) => s.statusFilter);
  const setStatusFilter = useEmailTemplatesStore((s) => s.setStatusFilter);
  const categoryFilter = useEmailTemplatesStore((s) => s.categoryFilter);
  const setCategoryFilter = useEmailTemplatesStore((s) => s.setCategoryFilter);
  const page = useEmailTemplatesStore((s) => s.page);
  const nextPage = useEmailTemplatesStore((s) => s.nextPage);
  const prevPage = useEmailTemplatesStore((s) => s.prevPage);

  const selectTemplate = useEmailTemplatesStore((s) => s.selectTemplate);
  const openNewTemplate = useEmailTemplatesStore((s) => s.openNewTemplate);
  const openDeleteTemplate = useEmailTemplatesStore((s) => s.openDeleteTemplate);
  const openSendEmail = useEmailTemplatesStore((s) => s.openSendEmail);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (query && !`${t.id} ${t.name} ${t.subject} ${t.category}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [templates, search, statusFilter, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredTemplates.length / EMAIL_TEMPLATES_PAGE_SIZE));
  const pageTemplates = useMemo(() => {
    const start = (page - 1) * EMAIL_TEMPLATES_PAGE_SIZE;
    return filteredTemplates.slice(start, start + EMAIL_TEMPLATES_PAGE_SIZE);
  }, [filteredTemplates, page]);
  const filteredCount = filteredTemplates.length;

  const [selected, setSelected] = useState(() => new Set());
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const getRowActions = (t) => [
    { label: "View Details", icon: <Eye />, onSelect: () => selectTemplate(t.id) },
    { label: "Use / Send", icon: <Mail />, onSelect: () => openSendEmail(t) },
    { label: "Edit Template", icon: <Edit2 />, onSelect: () => openNewTemplate(t) },
    "separator",
    { label: "Delete Template", icon: <Trash2 />, variant: "destructive", onSelect: () => openDeleteTemplate(t) },
  ];

  return (
    <div className="relative flex flex-col items-start rounded-md border border-border overflow-hidden w-full">
      <Image
        src="/dashboard/bg/trips-table.png"
        alt=""
        fill
        className="object-cover opacity-50 pointer-events-none"
        sizes="1600px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-[#e5eeff]/90 backdrop-blur-2xl pointer-events-none" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar">
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-secondary flex gap-2 items-center px-2 py-1 rounded-sm w-64 max-w-full">
            <Image src="/dashboard/icons/search.svg" alt="" width={16} height={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 min-w-0 bg-transparent font-space-grotesk text-[12px] text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <FilterDropdown label="All Status" value={statusFilter} options={templateStatusOptions} onChange={setStatusFilter} />
          <FilterDropdown label="All Categories" value={categoryFilter} options={templateCategoryOptions} onChange={setCategoryFilter} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-4 gap-2" onClick={() => openSendEmail(null)}>
            <Mail className="size-3.5" />
            Send Email
          </Button>
          <Button variant="secondary" className="px-4 gap-2" onClick={() => openNewTemplate(null)}>
            <Plus className="size-3.5" />
            New Template
          </Button>
        </div>
      </div>

      <div className="relative w-full lg:hidden">
        <EmailTemplatesCardsContainer
          templates={pageTemplates}
          selected={selected}
          onToggleRow={toggleRow}
          getRowActions={getRowActions}
          onSelectTemplate={selectTemplate}
        />
      </div>

      <div className="relative w-full overflow-x-auto hidden lg:block">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-black/10 border-border hover:bg-black/10">
              <TableHead className="w-10 p-[10px]">
                <Checkbox
                  checked={selected.size === pageTemplates.length && pageTemplates.length > 0}
                  onCheckedChange={() =>
                    setSelected((prev) =>
                      prev.size === pageTemplates.length ? new Set() : new Set(pageTemplates.map((t) => t.id))
                    )
                  }
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
            {pageTemplates.map((t) => (
              <TableRow
                key={t.id}
                className="border-border cursor-pointer hover:bg-secondary/40"
                onClick={() => selectTemplate(t.id)}
              >
                <TableCell className="p-[10px]" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleRow(t.id)} />
                </TableCell>
                <TableCell className="p-[10px] font-montserrat font-bold text-[12px] text-foreground">
                  {t.name}
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={t.category} bordered />
                  </div>
                </TableCell>
                <TableCell
                  className="p-[10px] font-montserrat font-semibold text-[12px] text-foreground text-left max-w-[340px] truncate"
                  title={t.subject}
                >
                  {t.subject}
                </TableCell>
                <TableCell className="p-[10px] text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={t.status} bordered />
                  </div>
                </TableCell>
                <TableCell className="p-[10px] text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <RowActionsMenu items={getRowActions(t)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pageTemplates.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="p-6 text-center font-montserrat text-[12px] text-muted-foreground">
                  No email templates match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="relative w-full">
        <TablePagination totalCount={filteredCount} itemLabel="templates" page={page} pageCount={pageCount} onPrev={prevPage} onNext={nextPage} />
      </div>
    </div>
  );
}

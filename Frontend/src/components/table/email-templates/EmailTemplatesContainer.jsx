"use client";

import { useMemo, useState } from "react";
import { Eye, Mail, Edit2, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useEmailTemplatesStore, EMAIL_TEMPLATES_PAGE_SIZE } from "@/store/useEmailTemplatesStore";
import TablePagination from "@/components/table/common/TablePagination";
import EmailTemplatesToolbar from "./EmailTemplatesToolbar";
import EmailTemplatesCardsContainer from "./EmailTemplatesCardsContainer";
import EmailTemplatesTable from "./EmailTemplatesTable";

export default function EmailTemplatesContainer({ revealDelay = 0 }) {
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
    const query = (search ?? "").trim().toLowerCase();
    return (templates ?? []).filter((t) => {
      if (statusFilter !== "All" && t?.status !== statusFilter) return false;
      if (categoryFilter !== "All" && t?.category !== categoryFilter) return false;
      if (query && !`${t?.id} ${t?.name} ${t?.subject} ${t?.category}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [templates, search, statusFilter, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil((filteredTemplates?.length ?? 0) / EMAIL_TEMPLATES_PAGE_SIZE));
  const pageTemplates = useMemo(() => {
    const start = (page - 1) * EMAIL_TEMPLATES_PAGE_SIZE;
    return filteredTemplates?.slice(start, start + EMAIL_TEMPLATES_PAGE_SIZE);
  }, [filteredTemplates, page]);
  const filteredCount = filteredTemplates?.length ?? 0;

  const [selected, setSelected] = useState(() => new Set());
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSelectAll = () => {
    if (selected.size === (pageTemplates?.length ?? 0)) {
      setSelected(new Set());
    } else {
      setSelected(new Set((pageTemplates ?? []).map((t) => t?.id)));
    }
  };

  const getRowActions = (t) => [
    { label: "View Details", icon: <Eye />, onSelect: () => selectTemplate?.(t?.id) },
    { label: "Use / Send", icon: <Mail />, onSelect: () => openSendEmail?.(t) },
    { label: "Edit Template", icon: <Edit2 />, onSelect: () => openNewTemplate?.(t) },
    "separator",
    { label: "Delete Template", icon: <Trash2 />, variant: "destructive", onSelect: () => openDeleteTemplate?.(t) },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <EmailTemplatesToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          onSendEmail={openSendEmail}
          onNewTemplate={openNewTemplate}
        />

        <div className="relative w-full lg:hidden">
          <EmailTemplatesCardsContainer
            templates={pageTemplates}
            selected={selected}
            onToggleRow={toggleRow}
            getRowActions={getRowActions}
            onSelectTemplate={selectTemplate}
          />
        </div>

        <EmailTemplatesTable
          pageTemplates={pageTemplates}
          selected={selected}
          onToggleRow={toggleRow}
          onSelectAll={handleSelectAll}
          onSelectTemplate={selectTemplate}
          getRowActions={getRowActions}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="templates"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>
      </CommonCard>
    </Reveal>
  );
}

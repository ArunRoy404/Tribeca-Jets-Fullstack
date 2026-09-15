"use client";

import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { templateStatusOptions, templateCategoryOptions } from "@/dummyData/emailTemplates";

export default function EmailTemplatesToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  onSendEmail,
  onNewTemplate,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search templates..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Status"
          value={statusFilter}
          options={templateStatusOptions}
          onChange={setStatusFilter}
        />
        <FilterDropdown
          label="All Categories"
          value={categoryFilter}
          options={templateCategoryOptions}
          onChange={setCategoryFilter}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onSendEmail?.(null)}>
          <Mail className="size-3.5" />
          <span>Send Email</span>
        </Button>
        <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onNewTemplate?.(null)}>
          <Plus className="size-3.5" />
          <span>New Template</span>
        </Button>
      </div>
    </div>
  );
}

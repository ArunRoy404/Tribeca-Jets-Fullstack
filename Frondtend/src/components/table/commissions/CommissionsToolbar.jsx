"use client";

import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { commissionsStatusFilterOptions } from "@/dummyData/commissions";

export default function CommissionsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onAddCommission,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Status"
          value={statusFilter}
          options={commissionsStatusFilterOptions}
          onChange={setStatusFilter}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => alert("Exporting commissions CSV...")}
          className="px-3 sm:px-4 gap-2"
        >
          <Download className="size-3.5" />
          <span>Export</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddCommission?.()}
          className="px-3 sm:px-4 gap-2"
        >
          <Plus className="size-3.5" />
          <span>Add Commission</span>
        </Button>
      </div>
    </div>
  );
}

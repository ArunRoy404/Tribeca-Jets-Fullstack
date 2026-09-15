"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { emptyLegsStatusFilterOptions } from "@/dummyData/emptyLegs";

export default function EmptyLegsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onAddEmptyLeg,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search empty legs..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Status"
          value={statusFilter}
          options={emptyLegsStatusFilterOptions}
          onChange={setStatusFilter}
        />
      </div>
      <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onAddEmptyLeg?.()}>
        <Plus className="size-3.5" />
        <span>Add Empty Leg</span>
      </Button>
    </div>
  );
}

"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { operatorStatusOptions } from "@/dummyData/operators";

export default function OperatorsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onAddOperator,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search operators..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Status"
          value={statusFilter}
          options={operatorStatusOptions}
          onChange={setStatusFilter}
        />
      </div>
      <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onAddOperator?.()}>
        <Plus className="size-3.5" />
        <span>Add Operator</span>
      </Button>
    </div>
  );
}

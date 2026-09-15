"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { transactionsStatusFilterOptions } from "@/dummyData/transactions";

export default function TransactionsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search transactions..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Status"
          value={statusFilter}
          options={transactionsStatusFilterOptions}
          onChange={setStatusFilter}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => alert("Exporting transactions CSV...")}
        className="px-3 sm:px-4 gap-2"
      >
        <Download className="size-3.5" />
        <span>Export</span>
      </Button>
    </div>
  );
}

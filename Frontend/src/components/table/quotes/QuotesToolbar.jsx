"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { quoteStatusOptions } from "@/dummyData/quotes";

export default function QuotesToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onNewQuote,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search quotes..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Status"
          value={statusFilter}
          options={quoteStatusOptions}
          onChange={setStatusFilter}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNewQuote?.()}
          className="px-3 sm:px-4 gap-2"
        >
          <Plus className="size-3.5" />
          <span>New Quote</span>
        </Button>
      </div>
    </div>
  );
}

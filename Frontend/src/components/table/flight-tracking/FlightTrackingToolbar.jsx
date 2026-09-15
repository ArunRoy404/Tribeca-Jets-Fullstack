"use client";

import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { flightStatusFilterOptions } from "@/dummyData/flightTracking";

export default function FlightTrackingToolbar({
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
          placeholder="Search by Trip #, tail #, client, route..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="Flight Status"
          value={statusFilter}
          options={flightStatusFilterOptions}
          onChange={setStatusFilter}
        />
      </div>
    </div>
  );
}

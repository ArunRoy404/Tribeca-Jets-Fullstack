"use client";

import { useScheduleStore } from "@/store/useScheduleStore";
import {
  scheduleStatusOptions,
  scheduleBrokerOptions,
  scheduleOperatorOptions,
  scheduleAircraftOptions,
  scheduleTripTypeOptions,
} from "@/dummyData/schedule";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import SearchInput from "@/components/table/common/SearchInput";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function ScheduleToolbar() {
  const search = useScheduleStore((s) => s.search);
  const setSearch = useScheduleStore((s) => s.setSearch);
  const statusFilter = useScheduleStore((s) => s.statusFilter);
  const setStatusFilter = useScheduleStore((s) => s.setStatusFilter);
  const brokerFilter = useScheduleStore((s) => s.brokerFilter);
  const setBrokerFilter = useScheduleStore((s) => s.setBrokerFilter);
  const operatorFilter = useScheduleStore((s) => s.operatorFilter);
  const setOperatorFilter = useScheduleStore((s) => s.setOperatorFilter);
  const aircraftFilter = useScheduleStore((s) => s.aircraftFilter);
  const setAircraftFilter = useScheduleStore((s) => s.setAircraftFilter);
  const tripTypeFilter = useScheduleStore((s) => s.tripTypeFilter);
  const setTripTypeFilter = useScheduleStore((s) => s.setTripTypeFilter);
  const clearFilters = useScheduleStore((s) => s.clearFilters);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search flights, clients, trips..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown label="All Status" value={statusFilter} options={scheduleStatusOptions} onChange={setStatusFilter} />
        <FilterDropdown label="All Brokers" value={brokerFilter} options={scheduleBrokerOptions} onChange={setBrokerFilter} />
        <FilterDropdown label="All Operators" value={operatorFilter} options={scheduleOperatorOptions} onChange={setOperatorFilter} />
        <FilterDropdown label="All Aircraft" value={aircraftFilter} options={scheduleAircraftOptions} onChange={setAircraftFilter} />
        <FilterDropdown label="All Trip Types" value={tripTypeFilter} options={scheduleTripTypeOptions} onChange={setTripTypeFilter} />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => clearFilters?.()}
        className="px-3 sm:px-4 gap-2 ml-auto"
      >
        <RotateCcw className="size-3.5" />
        Clear Filters
      </Button>
    </div>
  );
}

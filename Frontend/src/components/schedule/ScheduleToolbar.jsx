"use client";

import FilterDropdown from "@/components/table/common/FilterDropdown";
import SearchInput from "@/components/table/common/SearchInput";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import { useScheduleParams } from "@/hooks/schedule";
import BrokerPicker from "@/components/users/BrokerPicker";
import OperatorPicker from "@/components/operators/OperatorPicker";
import AircraftPicker from "@/components/aircraft/AircraftPicker";
import { TRIP_STATUSES, TRIP_TYPES, formatTripStatus, formatTripType } from "@/lib/trip";

/**
 * The calendar's filters, all in the URL. Brokers, operators and aircraft are
 * the real records — the old dropdowns named outside brokerages ("Skyline
 * Partners") and a fixed fleet, neither of which a trip can point at. The
 * status list is a trip's own: "Sourcing" belonged to a trip request, which is
 * never on a calendar of booked flights.
 */
export default function ScheduleToolbar() {
  const params = useScheduleParams();
  const [draft, setDraft] = useDebouncedParam(params.search, params.setSearch);

  const status = useEnumFilter(TRIP_STATUSES, formatTripStatus, "All Status");
  const type = useEnumFilter(TRIP_TYPES, formatTripType, "All Trip Types");


  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search TJ-1048, client, tail or operator..."
          value={draft ?? ""}
          onChange={(e) => setDraft?.(e.target.value)}
        />
        <FilterDropdown
          label="All Status"
          value={status.labelFor(params.status)}
          options={status.options}
          onChange={(label) => params.setStatus(status.valueByLabel[label] ?? "")}
        />
        {/* Brokers, operators and aircraft searched and paged by the server — no 100-row cap. */}
        <BrokerPicker
          variant="filter"
          value={params.assignedBrokerId}
          onChange={(id) => params.setAssignedBrokerId(id || "")}
          placeholder="All Brokers"
          clearLabel="All Brokers"
        />
        <OperatorPicker
          variant="filter"
          value={params.operatorId}
          onChange={(id) => params.setOperatorId(id || "")}
          placeholder="All Operators"
          allowClear
          clearLabel="All Operators"
        />
        <AircraftPicker
          variant="filter"
          value={params.aircraftId}
          onChange={(id) => params.setAircraftId(id || "")}
          placeholder="All Aircraft"
          allowClear
          clearLabel="All Aircraft"
        />
        <FilterDropdown
          label="All Trip Types"
          value={type.labelFor(params.type)}
          options={type.options}
          onChange={(label) => params.setType(type.valueByLabel[label] ?? "")}
        />
      </div>
      {params.hasFilters && (
        <Button variant="outline" size="sm" onClick={params.clearFilters} className="px-3 sm:px-4 gap-2 ml-auto">
          <RotateCcw className="size-3.5" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}

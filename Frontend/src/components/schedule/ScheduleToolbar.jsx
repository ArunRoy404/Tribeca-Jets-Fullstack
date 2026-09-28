"use client";

import { useMemo } from "react";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import SearchInput from "@/components/table/common/SearchInput";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter, useIdFilter } from "@/hooks/common/useEnumFilter";
import { useScheduleParams } from "@/hooks/schedule";
import { useUsers } from "@/hooks/users";
import { useOperators } from "@/hooks/operators";
import { useAircraftList } from "@/hooks/aircraft";
import { TRIP_STATUSES, TRIP_TYPES, formatTripStatus, formatTripType } from "@/lib/trip";
import { BROKER_ROLES } from "@/lib/roles";
import { personName } from "@/lib/lead";

const aircraftLabel = (a) => [a?.tailNumber, a?.model].filter(Boolean).join(" · ");
const operatorLabel = (o) => o?.name;

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

  const { data: users } = useUsers({ limit: 100 });
  const { data: operators } = useOperators({ limit: 100, sortBy: "name", sortOrder: "asc" });
  const { data: aircraft } = useAircraftList({ limit: 100 });

  const brokerRows = useMemo(() => (users?.data ?? []).filter((u) => BROKER_ROLES.has(u?.role)), [users?.data]);
  const broker = useIdFilter(brokerRows, personName, "All Brokers");
  const operator = useIdFilter(operators?.data, operatorLabel, "All Operators");
  const tail = useIdFilter(aircraft?.data, aircraftLabel, "All Aircraft");

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
        <FilterDropdown
          label="All Brokers"
          value={broker.labelFor(params.assignedBrokerId)}
          options={broker.options}
          onChange={(label) => params.setAssignedBrokerId(broker.idByLabel[label] ?? "")}
        />
        <FilterDropdown
          label="All Operators"
          value={operator.labelFor(params.operatorId)}
          options={operator.options}
          onChange={(label) => params.setOperatorId(operator.idByLabel[label] ?? "")}
        />
        <FilterDropdown
          label="All Aircraft"
          value={tail.labelFor(params.aircraftId)}
          options={tail.options}
          onChange={(label) => params.setAircraftId(tail.idByLabel[label] ?? "")}
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

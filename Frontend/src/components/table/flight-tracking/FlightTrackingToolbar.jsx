"use client";

import { RotateCcw } from "lucide-react";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import { Button } from "@/components/ui/button";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import {
  FLIGHT_STATUS_FILTERS,
  FLIGHT_WINDOWS,
  formatFlightStatusFilter,
  formatFlightWindow,
} from "@/lib/flight";

const WINDOW_OPTIONS = [...FLIGHT_WINDOWS, "ALL"];
const formatWindowOption = (value) => (value === "ALL" ? "All Flights" : formatFlightWindow(value));

/** The board's filters, all in the URL. There is no "Refresh Tracking": nothing is fetched from a feed. */
export default function FlightTrackingToolbar({ params }) {
  const [draft, setDraft] = useDebouncedParam(params?.search, params?.setSearch);
  const status = useEnumFilter(FLIGHT_STATUS_FILTERS, formatFlightStatusFilter, "All Flight Status");
  const range = useEnumFilter(WINDOW_OPTIONS, formatWindowOption, formatFlightWindow("ACTIVE"));

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search TJ-1048, client, tail or operator..."
          value={draft ?? ""}
          onChange={(e) => setDraft?.(e.target.value)}
        />
        <FilterDropdown
          label={formatFlightWindow("ACTIVE")}
          value={range.labelFor(params?.window)}
          options={range.options.slice(1)}
          onChange={(label) => params?.setWindow?.(range.valueByLabel[label] ?? "ACTIVE")}
        />
        <FilterDropdown
          label="All Flight Status"
          value={status.labelFor(params?.flightStatus)}
          options={status.options}
          onChange={(label) => params?.setFlightStatus?.(status.valueByLabel[label] ?? "")}
        />
        <PageSizeSelect value={params?.limit} onChange={params?.setLimit} />
      </div>
      {params?.hasFilters && (
        <Button variant="outline" size="sm" onClick={params?.clearFilters} className="px-3 sm:px-4 gap-2 ml-auto">
          <RotateCcw className="size-3.5" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}

"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import { airportCountryOptions } from "@/dummyData/airports";

export default function AirportsToolbar({
  search,
  setSearch,
  countryFilter,
  setCountryFilter,
  onAddAirport,
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search ICAO, IATA, airport or city..."
          value={search ?? ""}
          onChange={(e) => setSearch?.(e.target.value)}
        />
        <FilterDropdown
          label="All Countries"
          value={countryFilter}
          options={airportCountryOptions}
          onChange={setCountryFilter}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddAirport?.()}
        className="px-3 sm:px-4 gap-2"
      >
        <Plus className="size-3.5" />
        <span>Add Airport</span>
      </Button>
    </div>
  );
}

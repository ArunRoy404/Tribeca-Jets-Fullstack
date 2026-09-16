"use client";

import { useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import BulkDeleteButton from "@/components/table/common/BulkDeleteButton";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useAirportCountries } from "@/hooks/airports";
import { ARCHIVE_TABS } from "@/lib/archive";

const ALL_COUNTRIES = "All Countries";

const TAB_LABELS = {
  [ARCHIVE_TABS.LIVE]: "Airports",
  [ARCHIVE_TABS.ARCHIVED]: "Archived",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);

export default function AirportsToolbar({
  search,
  setSearch,
  countryFilter,
  setCountryFilter,
  limit,
  setLimit,
  onAddAirport,
  selectedCount = 0,
  onBulkAction,
  tab,
  setTab,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;
  // The field stays instant while the URL catches up, so typing does not put
  // one history entry and one request per keystroke.
  const commitSearch = useCallback((value) => setSearch?.(value), [setSearch]);
  const [draft, setDraft] = useDebouncedParam(search, commitSearch);

  // From the data, not a hardcoded list: the previous version offered five
  // countries chosen at design time, so a sixth airport was unfilterable.
  const { data: countries } = useAirportCountries();
  const options = useMemo(
    () => [ALL_COUNTRIES, ...(countries ?? [])],
    [countries],
  );

  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <FilterTabs
          options={Object.values(TAB_LABELS)}
          value={TAB_LABELS[tab] ?? TAB_LABELS[ARCHIVE_TABS.LIVE]}
          onValueChange={(label) => setTab?.(TAB_IDS[label] ?? ARCHIVE_TABS.LIVE)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search ICAO, IATA, airport or city..."
          value={draft ?? ""}
          onChange={(e) => setDraft?.(e.target.value)}
        />
        <FilterDropdown
          label={ALL_COUNTRIES}
          value={countryFilter || ALL_COUNTRIES}
          options={options}
          // The country name is the wire value here — there is no enum to map,
          // so the only translation is "All Countries" meaning no filter.
          onChange={(value) =>
            setCountryFilter?.(value === ALL_COUNTRIES ? "" : value)
          }
        />
        <PageSizeSelect value={limit} onChange={setLimit} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* The checkbox column is on both tabs, so both get a bulk action —
            Remove on the live list, Restore on Archived. Leaving Archived with
            checkboxes and no button was a selection that did nothing. */}
        <BulkDeleteButton
          count={selectedCount}
          itemLabel="airports"
          onClick={onBulkAction}
          action={isArchived ? "restore" : "remove"}
        />
        {isArchived ? null : <Button
        variant="outline"
        size="sm"
        onClick={() => onAddAirport?.()}
        className="px-3 sm:px-4 gap-2"
      >
        <Plus className="size-3.5" />
        <span>Add Airport</span>
        </Button>}
      </div>
      </div>
    </div>
  );
}

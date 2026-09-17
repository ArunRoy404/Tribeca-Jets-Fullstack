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
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import { useAircraftAmenities } from "@/hooks/aircraft";
import { Input } from "@/components/ui/input";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  FILTERABLE_AIRCRAFT_STATUSES,
  formatAircraftCategory,
  formatAircraftStatus,
} from "@/lib/aircraft";
import { ARCHIVE_TABS } from "@/lib/archive";

const ALL_STATUS = "All Status";
const ALL_CATEGORIES = "All Categories";
const ANY_CABIN = "Any Cabin Feature";

const TAB_LABELS = {
  [ARCHIVE_TABS.LIVE]: "Aircraft",
  [ARCHIVE_TABS.ARCHIVED]: "Archived",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);

export default function AircraftToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  minPassengers,
  setMinPassengers,
  minRangeNm,
  setMinRangeNm,
  amenities,
  setAmenities,
  limit,
  setLimit,
  onAddAircraft,
  selectedCount = 0,
  onBulkAction,
  tab,
  setTab,
  mayWrite = true,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;

  // The field stays instant while the URL catches up, so typing does not put
  // one history entry and one request per keystroke.
  const commitSearch = useCallback((value) => setSearch?.(value), [setSearch]);
  const [draft, setDraft] = useDebouncedParam(search, commitSearch);

  // The two capacity boxes are typed into, so they debounce like the search
  // field — otherwise "6750" is four requests and four history entries.
  const commitPax = useCallback((value) => setMinPassengers?.(value), [setMinPassengers]);
  const [paxDraft, setPaxDraft] = useDebouncedParam(minPassengers, commitPax);
  const commitRange = useCallback((value) => setMinRangeNm?.(value), [setMinRangeNm]);
  const [rangeDraft, setRangeDraft] = useDebouncedParam(minRangeNm, commitRange);

  // Derived from the fleet, so the dropdown never offers a feature nothing has.
  const { data: amenityOptions } = useAircraftAmenities();
  const cabinOptions = useMemo(
    () => [ANY_CABIN, ...(amenityOptions ?? [])],
    [amenityOptions],
  );

  const status = useEnumFilter(
    FILTERABLE_AIRCRAFT_STATUSES,
    formatAircraftStatus,
    ALL_STATUS,
  );
  const category = useEnumFilter(
    FILTERABLE_AIRCRAFT_CATEGORIES,
    formatAircraftCategory,
    ALL_CATEGORIES,
  );

  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <FilterTabs
        options={Object.values(TAB_LABELS)}
        value={TAB_LABELS[tab] ?? TAB_LABELS[ARCHIVE_TABS.LIVE]}
        onValueChange={(label) => setTab?.(TAB_IDS[label] ?? ARCHIVE_TABS.LIVE)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            size="sm"
            placeholder="Search tail, model or operator..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_CATEGORIES}
            value={categoryFilter ? formatAircraftCategory(categoryFilter) : ALL_CATEGORIES}
            options={category.options}
            onChange={(label) => setCategoryFilter?.(category.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ALL_STATUS}
            value={statusFilter ? formatAircraftStatus(statusFilter) : ALL_STATUS}
            options={status.options}
            onChange={(label) => setStatusFilter?.(status.valueByLabel[label] ?? "")}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        {/* The fleet finder (scope §6.8). "At least" bounds, because the
            question is "what can carry nine people to Aspen" — more seats or
            more range still answers it. */}
        <div className="flex flex-wrap items-center gap-2 w-full">
          <Input
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="Min seats"
            value={paxDraft ?? ""}
            onChange={(e) => setPaxDraft?.(e.target.value)}
            className="h-9 w-32 text-[13px]"
            aria-label="Minimum passenger capacity"
          />
          <Input
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="Min range (nm)"
            value={rangeDraft ?? ""}
            onChange={(e) => setRangeDraft?.(e.target.value)}
            className="h-9 w-40 text-[13px]"
            aria-label="Minimum range in nautical miles"
          />
          <FilterDropdown
            label={ANY_CABIN}
            value={amenities || ANY_CABIN}
            options={cabinOptions}
            onChange={(label) => setAmenities?.(label === ANY_CABIN ? "" : label)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* The checkbox column is on both tabs, so both get a bulk action —
              Remove on the live list, Restore on Archived. Hidden entirely
              for a role that may only read: an assistant collecting a 403
              toast reads as a broken app, not a permission boundary. */}
          {mayWrite ? (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="aircraft"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          ) : null}
          {/* Adding is a live-tab verb, and a write. */}
          {isArchived || !mayWrite ? null : (
            <Button
              variant="outline"
              size="sm"
              className="px-3 sm:px-4 gap-2"
              onClick={() => onAddAircraft?.()}
            >
              <Plus className="size-3.5" />
              <span>Add Aircraft</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

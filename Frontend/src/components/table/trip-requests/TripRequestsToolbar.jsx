"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import BulkDeleteButton from "@/components/table/common/BulkDeleteButton";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  formatAircraftCategory,
} from "@/lib/aircraft";
import { LEAD_SOURCES, REQUEST_STATUSES, formatLeadSource, formatRequestStatus } from "@/lib/lead";
import { REQUEST_TABS, REQUEST_WINDOWS } from "@/hooks/trip-requests";

const ALL_STATUS = "All Status";
const ALL_SOURCES = "All Sources";
const ALL_AIRCRAFT = "Any Aircraft";
const ANY_DEPARTURE = "Any Departure";

/**
 * Three tabs, not two.
 *
 * "Active" is the default and is what the client asked for by name — the
 * enquiries still in play. "All" is the log he wanted kept: the ones that never
 * booked, still there to match against an empty leg later. "Archived" is the
 * usual third half, for rows that should not have been filed at all.
 */
const TAB_LABELS = {
  [REQUEST_TABS.ACTIVE]: "Active",
  [REQUEST_TABS.ALL]: "All Requests",
  [REQUEST_TABS.ARCHIVED]: "Archived",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);

/** Departure relative to today, as the desk reads it. */
const WINDOW_LABELS = {
  OVERDUE: "Departure passed",
  TODAY: "Departing today",
  UPCOMING: "Upcoming",
};
const formatWindow = (value) => WINDOW_LABELS[value] ?? value;

export default function TripRequestsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  aircraftFilter,
  setAircraftFilter,
  departureFilter,
  setDepartureFilter,
  limit,
  setLimit,
  onAddRequest,
  selectedCount = 0,
  onBulkAction,
  tab,
  setTab,
  mayWrite = true,
  mayRemove = true,
}) {
  const isArchived = tab === REQUEST_TABS.ARCHIVED;

  // The field stays instant while the URL catches up, so typing does not put
  // one history entry and one request per keystroke.
  const commitSearch = useCallback((value) => setSearch?.(value), [setSearch]);
  const [draft, setDraft] = useDebouncedParam(search, commitSearch);

  const status = useEnumFilter(REQUEST_STATUSES, formatRequestStatus, ALL_STATUS);
  const source = useEnumFilter(LEAD_SOURCES, formatLeadSource, ALL_SOURCES);
  const aircraft = useEnumFilter(
    FILTERABLE_AIRCRAFT_CATEGORIES,
    formatAircraftCategory,
    ALL_AIRCRAFT,
  );
  const departure = useEnumFilter(REQUEST_WINDOWS, formatWindow, ANY_DEPARTURE);

  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <FilterTabs
        options={Object.values(TAB_LABELS)}
        value={TAB_LABELS[tab] ?? TAB_LABELS[REQUEST_TABS.ACTIVE]}
        onValueChange={(label) => setTab?.(TAB_IDS[label] ?? REQUEST_TABS.ACTIVE)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            size="sm"
            placeholder="Search client, route or summary..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          {/* On the Active tab every row is by definition open, sourcing or
              quoted, so a status dropdown there offers two values that return
              nothing. It appears on the tabs where it means something. */}
          {tab === REQUEST_TABS.ACTIVE ? null : (
            <FilterDropdown
              label={ALL_STATUS}
              value={status.labelFor(statusFilter)}
              options={status.options}
              onChange={(label) => setStatusFilter?.(status.valueByLabel[label] ?? "")}
            />
          )}
          <FilterDropdown
            label={ALL_SOURCES}
            value={source.labelFor(sourceFilter)}
            options={source.options}
            onChange={(label) => setSourceFilter?.(source.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ALL_AIRCRAFT}
            value={aircraft.labelFor(aircraftFilter)}
            options={aircraft.options}
            onChange={(label) => setAircraftFilter?.(aircraft.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ANY_DEPARTURE}
            value={departure.labelFor(departureFilter)}
            options={departure.options}
            onChange={(label) => setDepartureFilter?.(departure.valueByLabel[label] ?? "")}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* The checkbox column is on every tab, so every tab gets a bulk
              action — Restore on Archived, Remove elsewhere. Hidden entirely
              for a role that cannot act on a selection: a broker collecting a
              403 toast reads as a broken app, not a permission boundary. */}
          {mayRemove ? (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="request"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          ) : null}
          {/* Filing is a live-tab verb, and a write. */}
          {isArchived || !mayWrite ? null : (
            <Button
              variant="outline"
              size="sm"
              className="px-3 sm:px-4 gap-2"
              onClick={() => onAddRequest?.()}
            >
              <Plus className="size-3.5" />
              <span>New Request</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

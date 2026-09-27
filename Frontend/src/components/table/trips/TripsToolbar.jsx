"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import BulkDeleteButton from "@/components/table/common/BulkDeleteButton";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import { useUsers } from "@/hooks/users";
import { TRIP_STATUSES, formatTripStatus } from "@/lib/trip";
import { personName } from "@/lib/lead";
import { ARCHIVE_TABS } from "@/lib/archive";
import { BROKER_ROLES } from "@/lib/roles";

const ALL_STATUS = "All Status";
const ALL_BROKERS = "All Brokers";
const ANY_DATE = "Any Date";

const WINDOWS = ["UPCOMING", "TODAY", "PAST"];
const WINDOW_LABELS = { UPCOMING: "Upcoming", TODAY: "Departing Today", PAST: "Departed" };
const formatWindow = (value) => WINDOW_LABELS[value] ?? value;

const TAB_LABELS = { [ARCHIVE_TABS.LIVE]: "Trips", [ARCHIVE_TABS.ARCHIVED]: "Archived" };
const TAB_IDS = Object.fromEntries(Object.entries(TAB_LABELS).map(([id, label]) => [label, id]));

/**
 * The trips board's filters, all in the URL.
 *
 * The old board's "All Payments" filter is gone rather than faked: a trip's
 * payment state belongs to Receivables (#16), which does not exist yet, and a
 * filter over a column nobody fills in filters nothing. The Export button went
 * with the dialog it opened, which promised "all 16 operations" whatever the
 * data said — export is its own module (#26).
 */
export default function TripsToolbar({
  search,
  setSearch,
  status,
  setStatus,
  departure,
  setDeparture,
  assignedBrokerId,
  setAssignedBrokerId,
  limit,
  setLimit,
  tab,
  setTab,
  selectedCount = 0,
  onBulkAction,
  mayWrite = false,
  mayArchive = false,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;
  const [draft, setDraft] = useDebouncedParam(search, setSearch);

  const statusFilter = useEnumFilter(TRIP_STATUSES, formatTripStatus, ALL_STATUS);
  const windowFilter = useEnumFilter(WINDOWS, formatWindow, ANY_DATE);

  const { data: users } = useUsers({ limit: 100 });
  const broker = useMemo(() => {
    const brokers = (users?.data ?? []).filter((u) => BROKER_ROLES.has(u?.role));
    const idByLabel = {};
    const labelById = {};
    for (const b of brokers) {
      const label = personName(b);
      idByLabel[label] = b.id;
      labelById[b.id] = label;
    }
    return { options: [ALL_BROKERS, ...Object.keys(idByLabel)], idByLabel, labelById };
  }, [users?.data]);

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
            placeholder="Search TJ-1048, client, tail or operator..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_STATUS}
            value={statusFilter.labelFor(status)}
            options={statusFilter.options}
            onChange={(label) => setStatus?.(statusFilter.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ANY_DATE}
            value={windowFilter.labelFor(departure)}
            options={windowFilter.options}
            onChange={(label) => setDeparture?.(windowFilter.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ALL_BROKERS}
            value={broker.labelById[assignedBrokerId] ?? ALL_BROKERS}
            options={broker.options}
            onChange={(label) => setAssignedBrokerId?.(broker.idByLabel[label] ?? "")}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mayArchive && (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="trips"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          )}
          {mayWrite && !isArchived && (
            <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" render={<Link href="/dashboard/trips/new" />}>
              <Plus className="size-3.5" />
              New Trip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

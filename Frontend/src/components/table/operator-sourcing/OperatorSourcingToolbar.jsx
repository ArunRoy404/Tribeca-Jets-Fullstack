"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import BrokerPicker from "@/components/users/BrokerPicker";
import {
  FILTERABLE_AIRCRAFT_CATEGORIES,
  formatAircraftCategory,
} from "@/lib/aircraft";
import { formatRequestStatus, REQUEST_STATUSES } from "@/lib/lead";
import { ARCHIVE_TABS } from "@/lib/archive";

const ALL_STATUS = "All Status";
const ALL_CATEGORIES = "All Aircraft";
const ALL_BROKERS = "All Brokers";

const TAB_LABELS = {
  [ARCHIVE_TABS.LIVE]: "Sourcing",
  [ARCHIVE_TABS.ARCHIVED]: "Archived",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);


export default function OperatorSourcingToolbar({
  search,
  setSearch,
  status,
  setStatus,
  aircraftPreference,
  setAircraftPreference,
  assignedBrokerId,
  setAssignedBrokerId,
  limit,
  setLimit,
  tab,
  setTab,
  onNewRequest,
  mayWrite = true,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;

  // The field stays instant; only the URL waits.
  const [draft, setDraft] = useDebouncedParam(search, setSearch);

  const statusFilter = useEnumFilter(
    REQUEST_STATUSES,
    formatRequestStatus,
    ALL_STATUS,
  );
  const categoryFilter = useEnumFilter(
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
            placeholder="Search by client, route or reference..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_STATUS}
            value={statusFilter.labelFor(status)}
            options={statusFilter.options}
            onChange={(label) =>
              setStatus?.(statusFilter.valueByLabel[label] ?? "")
            }
          />
          <FilterDropdown
            label={ALL_CATEGORIES}
            value={categoryFilter.labelFor(aircraftPreference)}
            options={categoryFilter.options}
            onChange={(label) =>
              setAircraftPreference?.(categoryFilter.valueByLabel[label] ?? "")
            }
          />
          <BrokerPicker
            variant="filter"
            value={assignedBrokerId}
            onChange={(id) => setAssignedBrokerId?.(id || "")}
            placeholder={ALL_BROKERS}
            clearLabel={ALL_BROKERS}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        {/* Hidden, not disabled, for a role that cannot source: a greyed-out
            button invites a click and explains nothing. Filing a new enquiry
            is a live-tab verb, so Archived offers no Add button either. */}
        {mayWrite && !isArchived && (
          <Button
            variant="outline"
            size="sm"
            className="px-3 sm:px-4 gap-2"
            onClick={() => onNewRequest?.()}
          >
            <Plus className="size-3.5" />
            <span>New Sourcing Request</span>
          </Button>
        )}
      </div>
    </div>
  );
}

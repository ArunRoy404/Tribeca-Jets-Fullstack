"use client";

import { useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useUsers } from "@/hooks/users";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  formatLeadSource,
  formatLeadStage,
  formatPriority,
  personName,
} from "@/lib/lead";
import { ARCHIVE_TABS } from "@/lib/archive";

const ALL_STAGES = "All Stages";
const ALL_SOURCES = "All Sources";
const ALL_PRIORITY = "All Priority";
const ALL_BROKERS = "All Brokers";

const TAB_LABELS = {
  [ARCHIVE_TABS.LIVE]: "Leads",
  [ARCHIVE_TABS.ARCHIVED]: "Archived",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);

const BROKER_ROLES = new Set(["BROKER", "SENIOR_BROKER", "ADMIN"]);

/** Labels for the dropdown, enum constants on the wire. Same shape three times. */
function useEnumFilter(values, format, allLabel) {
  const options = useMemo(() => [allLabel, ...values.map(format)], [values, format, allLabel]);
  const valueByLabel = useMemo(
    () => Object.fromEntries(values.map((value) => [format(value), value])),
    [values, format],
  );
  return { options, valueByLabel };
}

export default function LeadsToolbar({
  search,
  setSearch,
  stageFilter,
  setStageFilter,
  sourceFilter,
  setSourceFilter,
  priorityFilter,
  setPriorityFilter,
  brokerFilter,
  setBrokerFilter,
  limit,
  setLimit,
  onAddLead,
  tab,
  setTab,
  mayWrite = true,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;

  const commitSearch = useCallback((value) => setSearch?.(value), [setSearch]);
  const [draft, setDraft] = useDebouncedParam(search, commitSearch);

  const stage = useEnumFilter(LEAD_STAGES, formatLeadStage, ALL_STAGES);
  const source = useEnumFilter(LEAD_SOURCES, formatLeadSource, ALL_SOURCES);
  const priority = useEnumFilter(LEAD_PRIORITIES, formatPriority, ALL_PRIORITY);

  // The real desk, not four hardcoded first names.
  const { data: users } = useUsers({ limit: 100 });
  const brokers = useMemo(
    () => (users?.data ?? []).filter((u) => BROKER_ROLES.has(u?.role)),
    [users?.data],
  );
  const brokerOptions = useMemo(
    () => [ALL_BROKERS, ...brokers.map(personName)],
    [brokers],
  );
  const brokerIdByName = useMemo(
    () => Object.fromEntries(brokers.map((b) => [personName(b), b.id])),
    [brokers],
  );
  const brokerNameById = useMemo(
    () => Object.fromEntries(brokers.map((b) => [b.id, personName(b)])),
    [brokers],
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
            placeholder="Search leads..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_STAGES}
            value={stageFilter ? formatLeadStage(stageFilter) : ALL_STAGES}
            options={stage.options}
            onChange={(label) => setStageFilter?.(stage.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ALL_SOURCES}
            value={sourceFilter ? formatLeadSource(sourceFilter) : ALL_SOURCES}
            options={source.options}
            onChange={(label) => setSourceFilter?.(source.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ALL_PRIORITY}
            value={priorityFilter ? formatPriority(priorityFilter) : ALL_PRIORITY}
            options={priority.options}
            onChange={(label) => setPriorityFilter?.(priority.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ALL_BROKERS}
            value={brokerNameById[brokerFilter] ?? ALL_BROKERS}
            options={brokerOptions}
            onChange={(label) => setBrokerFilter?.(brokerIdByName[label] ?? "")}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        {/* Adding is a live-tab verb, and a write. */}
        {isArchived || !mayWrite ? null : (
          <Button
            variant="outline"
            size="sm"
            className="px-3 sm:px-4 gap-2"
            onClick={() => onAddLead?.()}
          >
            <Plus className="size-3.5" />
            <span>Add Lead</span>
          </Button>
        )}
      </div>
    </div>
  );
}

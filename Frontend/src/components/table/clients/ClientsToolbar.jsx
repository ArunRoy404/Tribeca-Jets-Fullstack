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
import { useUsers } from "@/hooks/users";
import {
  FILTERABLE_CLIENT_STATUSES,
  FILTERABLE_CLIENT_TYPES,
  FOLLOW_UP_WINDOWS,
  formatClientStatus,
  formatClientType,
  formatFollowUpWindow,
} from "@/lib/client";
import { ARCHIVE_TABS } from "@/lib/archive";
import { BROKER_ROLES } from "@/lib/roles";

const ALL_STATUSES = "All Statuses";
const ALL_TYPES = "All Types";
const ALL_BROKERS = "All Brokers";
const ALL_FOLLOW_UPS = "All Follow-ups";

const TAB_LABELS = {
  [ARCHIVE_TABS.LIVE]: "Clients",
  [ARCHIVE_TABS.ARCHIVED]: "Archived",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);


export default function ClientsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  brokerFilter,
  setBrokerFilter,
  followUpFilter,
  setFollowUpFilter,
  limit,
  setLimit,
  onAddClient,
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

  // From the real staff directory rather than a hardcoded list — every signed
  // in user may list colleagues precisely so pickers like this one work.
  const { data: users } = useUsers({ limit: 100 });
  const brokers = useMemo(
    () => (users?.data ?? []).filter((u) => BROKER_ROLES.has(u?.role)),
    [users?.data],
  );
  const brokerOptions = useMemo(
    () => [
      ALL_BROKERS,
      ...brokers.map((b) => `${b.firstName} ${b.lastName}`.trim()),
    ],
    [brokers],
  );
  const brokerLabelToId = useMemo(
    () =>
      Object.fromEntries(
        brokers.map((b) => [`${b.firstName} ${b.lastName}`.trim(), b.id]),
      ),
    [brokers],
  );
  const brokerLabel = useMemo(() => {
    const match = brokers.find((b) => b.id === brokerFilter);
    return match ? `${match.firstName} ${match.lastName}`.trim() : ALL_BROKERS;
  }, [brokers, brokerFilter]);

  const statusOptions = useMemo(
    () => [ALL_STATUSES, ...FILTERABLE_CLIENT_STATUSES.map(formatClientStatus)],
    [],
  );
  const typeOptions = useMemo(
    () => [ALL_TYPES, ...FILTERABLE_CLIENT_TYPES.map(formatClientType)],
    [],
  );
  const followUpOptions = useMemo(
    () => [ALL_FOLLOW_UPS, ...FOLLOW_UP_WINDOWS.map(formatFollowUpWindow)],
    [],
  );

  const toValue = (labels, values) => (label) => {
    const idx = labels.indexOf(label);
    return idx <= 0 ? undefined : values[idx - 1];
  };

  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <FilterTabs
          options={Object.values(TAB_LABELS)}
          value={TAB_LABELS[tab] ?? TAB_LABELS[ARCHIVE_TABS.LIVE]}
          onValueChange={(label) => setTab?.(TAB_IDS[label] ?? ARCHIVE_TABS.LIVE)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {/* The checkbox column is on both tabs, so both get a bulk action —
              Remove on the live list, Restore on Archived. */}
          <BulkDeleteButton
            count={selectedCount}
            itemLabel="clients"
            onClick={onBulkAction}
            action={isArchived ? "restore" : "remove"}
          />
          {/* Adding is a live-tab verb only. */}
          {isArchived ? null : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddClient?.()}
              className="px-3 sm:px-4 gap-2"
            >
              <Plus className="size-3.5" />
              <span>Add Client</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search clients, companies, email..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <FilterDropdown
          label={ALL_STATUSES}
          value={statusFilter ? formatClientStatus(statusFilter) : ALL_STATUSES}
          options={statusOptions}
          onChange={(label) =>
            setStatusFilter?.(toValue(statusOptions, FILTERABLE_CLIENT_STATUSES)(label))
          }
        />
        <FilterDropdown
          label={ALL_TYPES}
          value={typeFilter ? formatClientType(typeFilter) : ALL_TYPES}
          options={typeOptions}
          onChange={(label) =>
            setTypeFilter?.(toValue(typeOptions, FILTERABLE_CLIENT_TYPES)(label))
          }
        />
        <FilterDropdown
          label={ALL_BROKERS}
          value={brokerLabel}
          options={brokerOptions}
          onChange={(label) => setBrokerFilter?.(brokerLabelToId[label])}
        />
        {/* Nothing to follow up on a client nobody is working any more. */}
        {isArchived ? null : (
          <FilterDropdown
            label={ALL_FOLLOW_UPS}
            value={followUpFilter ? formatFollowUpWindow(followUpFilter) : ALL_FOLLOW_UPS}
            options={followUpOptions}
            onChange={(label) =>
              setFollowUpFilter?.(toValue(followUpOptions, FOLLOW_UP_WINDOWS)(label))
            }
          />
        )}
        <PageSizeSelect value={limit} onChange={setLimit} />
      </div>
    </div>
  );
}

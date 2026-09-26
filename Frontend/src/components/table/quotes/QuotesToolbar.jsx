"use client";

import { useMemo } from "react";
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
import { formatQuoteStatus, QUOTE_STATUSES } from "@/lib/quote";
import { personName } from "@/lib/lead";
import { ARCHIVE_TABS } from "@/lib/archive";
import { BROKER_ROLES } from "@/lib/roles";

const ALL_STATUS = "All Status";
const ALL_BROKERS = "All Brokers";

const TAB_LABELS = {
  [ARCHIVE_TABS.LIVE]: "Quotes",
  [ARCHIVE_TABS.ARCHIVED]: "Archived",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);


export default function QuotesToolbar({
  search,
  setSearch,
  status,
  setStatus,
  assignedBrokerId,
  setAssignedBrokerId,
  limit,
  setLimit,
  tab,
  setTab,
  onNewQuote,
  selectedCount = 0,
  onBulkAction,
  mayWrite = true,
  mayArchive = true,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;

  // The field stays instant; only the URL waits.
  const [draft, setDraft] = useDebouncedParam(search, setSearch);

  const statusFilter = useEnumFilter(
    QUOTE_STATUSES,
    formatQuoteStatus,
    ALL_STATUS,
  );

  // Real colleagues, never a hardcoded list of first names.
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
            placeholder="Search client, operator, aircraft or route..."
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
            label={ALL_BROKERS}
            value={broker.labelById[assignedBrokerId] ?? ALL_BROKERS}
            options={broker.options}
            onChange={(label) => setAssignedBrokerId?.(broker.idByLabel[label] ?? "")}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* The checkbox column and its button go together: selection with
              nothing to act on is a control that does nothing. */}
          {mayArchive && (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="quotes"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          )}
          {/* Writing a quote is a live-tab verb, and hidden — not disabled —
              for a role that cannot: a greyed-out button invites a click and
              explains nothing. */}
          {mayWrite && !isArchived && (
            <Button
              variant="outline"
              size="sm"
              className="px-3 sm:px-4 gap-2"
              onClick={() => onNewQuote?.()}
            >
              <Plus className="size-3.5" />
              <span>New Quote</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

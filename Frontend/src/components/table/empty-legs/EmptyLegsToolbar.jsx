"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import BulkDeleteButton from "@/components/table/common/BulkDeleteButton";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import { EMPTY_LEG_STATUSES, formatEmptyLegStatus } from "@/lib/emptyLeg";
import { ARCHIVE_TABS } from "@/lib/archive";

const ALL_STATUS = "All Status";
const TAB_LABELS = { [ARCHIVE_TABS.LIVE]: "Empty Legs", [ARCHIVE_TABS.ARCHIVED]: "Archived" };
const TAB_IDS = Object.fromEntries(Object.entries(TAB_LABELS).map(([id, label]) => [label, id]));

/** The board's filters, all in the URL. */
export default function EmptyLegsToolbar({
  search,
  setSearch,
  status,
  setStatus,
  limit,
  setLimit,
  tab,
  setTab,
  selectedCount = 0,
  onBulkAction,
  onAddEmptyLeg,
  mayWrite = false,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;
  const [draft, setDraft] = useDebouncedParam(search, setSearch);
  const statusFilter = useEnumFilter(EMPTY_LEG_STATUSES, formatEmptyLegStatus, ALL_STATUS);

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
            placeholder="Search EL-1001, airport, operator or tail..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_STATUS}
            value={statusFilter.labelFor(status)}
            options={statusFilter.options}
            onChange={(label) => setStatus?.(statusFilter.valueByLabel[label] ?? "")}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mayWrite && (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="empty legs"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          )}
          {mayWrite && !isArchived && (
            <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onAddEmptyLeg?.()}>
              <Plus className="size-3.5" />
              <span>Add Empty Leg</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

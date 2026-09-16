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
import {
  FILTERABLE_OPERATOR_STATUSES,
  formatOperatorStatus,
} from "@/lib/operator";
import { ARCHIVE_TABS } from "@/lib/archive";


const ALL_STATUS = "All Status";

const TAB_LABELS = {
  [ARCHIVE_TABS.LIVE]: "Operators",
  [ARCHIVE_TABS.ARCHIVED]: "Archived",
};
const TAB_IDS = Object.fromEntries(
  Object.entries(TAB_LABELS).map(([id, label]) => [label, id]),
);

export default function OperatorsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  limit,
  setLimit,
  onAddOperator,
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

  // Display labels here, enum constants on the wire — the URL and the API both
  // carry PREFERRED, never "Preferred".
  const options = useMemo(
    () => [ALL_STATUS, ...FILTERABLE_OPERATOR_STATUSES.map(formatOperatorStatus)],
    [],
  );
  const valueByLabel = useMemo(
    () => Object.fromEntries(
      FILTERABLE_OPERATOR_STATUSES.map((s) => [formatOperatorStatus(s), s]),
    ),
    [],
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
          placeholder="Search operators..."
          value={draft ?? ""}
          onChange={(e) => setDraft?.(e.target.value)}
        />
        <FilterDropdown
          label={ALL_STATUS}
          value={statusFilter ? formatOperatorStatus(statusFilter) : ALL_STATUS}
          options={options}
          onChange={(label) => setStatusFilter?.(valueByLabel[label] ?? "")}
        />
        <PageSizeSelect value={limit} onChange={setLimit} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* The checkbox column is on both tabs, so both get a bulk action —
            Remove on the live list, Restore on Archived. Leaving Archived with
            checkboxes and no button was a selection that did nothing. */}
        <BulkDeleteButton
          count={selectedCount}
          itemLabel="operators"
          onClick={onBulkAction}
          action={isArchived ? "restore" : "remove"}
        />
        {/* Adding is a live-tab verb only. */}
        {isArchived ? null : (
          <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onAddOperator?.()}>
            <Plus className="size-3.5" />
            <span>Add Operator</span>
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}

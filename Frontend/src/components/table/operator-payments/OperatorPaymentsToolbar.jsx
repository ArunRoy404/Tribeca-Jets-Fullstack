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
import { PAYABLE_STATES, formatPayableState } from "@/lib/operatorPayment";
import { ARCHIVE_TABS } from "@/lib/archive";

const ALL_STATES = "All Status";
const TAB_LABELS = { [ARCHIVE_TABS.LIVE]: "Operator Payments", [ARCHIVE_TABS.ARCHIVED]: "Archived" };
const TAB_IDS = Object.fromEntries(Object.entries(TAB_LABELS).map(([id, label]) => [label, id]));

/**
 * The board's filters, all in the URL. The status filter is the API's
 * computed state. The old screen's "Pending" is gone — a bill is Due until
 * money moves, and nothing recorded what "Pending" meant on top of that.
 */
export default function OperatorPaymentsToolbar({
  search,
  setSearch,
  state,
  setState,
  limit,
  setLimit,
  tab,
  setTab,
  selectedCount = 0,
  onBulkAction,
  onAdd,
  mayWrite = false,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;
  const [draft, setDraft] = useDebouncedParam(search, setSearch);
  const stateFilter = useEnumFilter(PAYABLE_STATES, formatPayableState, ALL_STATES);

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
            placeholder="Search OP-2026-0045, TJ-1048, operator..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_STATES}
            value={stateFilter.labelFor(state)}
            options={stateFilter.options}
            onChange={(label) => setState?.(stateFilter.valueByLabel[label] ?? "")}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mayWrite && (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="bills"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          )}
          {mayWrite && !isArchived && (
            <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onAdd?.()}>
              <Plus className="size-3.5" />
              <span>Add Operator Bill</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

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
import {
  COMMISSION_STATUSES,
  RECIPIENT_TYPES,
  formatCommissionStatus,
  formatRecipientType,
} from "@/lib/commission";
import { ARCHIVE_TABS } from "@/lib/archive";

const ALL_STATUS = "All Status";
const ALL_TYPES = "All Recipients";
const TAB_LABELS = { [ARCHIVE_TABS.LIVE]: "Commissions", [ARCHIVE_TABS.ARCHIVED]: "Archived" };
const TAB_IDS = Object.fromEntries(Object.entries(TAB_LABELS).map(([id, label]) => [label, id]));

/**
 * The board's filters, all in the URL. The old screen's "Due", "Overdue" and
 * "Partially Paid" filters are gone: "Due" is Earned, and the other two need
 * a due date and part-payments nobody records.
 */
export default function CommissionsToolbar({
  search,
  setSearch,
  status,
  setStatus,
  recipientType,
  setRecipientType,
  limit,
  setLimit,
  tab,
  setTab,
  selectedCount = 0,
  onBulkAction,
  onAddCommission,
  mayWrite = false,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;
  const [draft, setDraft] = useDebouncedParam(search, setSearch);
  const statusFilter = useEnumFilter(COMMISSION_STATUSES, formatCommissionStatus, ALL_STATUS);
  const typeFilter = useEnumFilter(RECIPIENT_TYPES, formatRecipientType, ALL_TYPES);

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
            placeholder="Search COM-1001, TJ-1048, payee or client..."
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
            label={ALL_TYPES}
            value={typeFilter.labelFor(recipientType)}
            options={typeFilter.options}
            onChange={(label) => setRecipientType?.(typeFilter.valueByLabel[label] ?? "")}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mayWrite && (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="commissions"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          )}
          {mayWrite && !isArchived && (
            <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onAddCommission?.()}>
              <Plus className="size-3.5" />
              <span>Add Commission</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

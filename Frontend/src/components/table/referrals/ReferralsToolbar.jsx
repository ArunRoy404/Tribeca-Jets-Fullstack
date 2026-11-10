"use client";

import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import BulkDeleteButton from "@/components/table/common/BulkDeleteButton";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import ReferralAgentPicker from "@/components/users/ReferralAgentPicker";
import { REFERRAL_STATUSES, formatReferralStatus } from "@/lib/referral";
import { ARCHIVE_TABS } from "@/lib/archive";

const ALL_STATUS = "All Status";
const ALL_AGENTS = "All Agents";
const TAB_LABELS = { [ARCHIVE_TABS.LIVE]: "Referrals", [ARCHIVE_TABS.ARCHIVED]: "Archived" };
const TAB_IDS = Object.fromEntries(Object.entries(TAB_LABELS).map(([id, label]) => [label, id]));

/** The board's filters, all in the URL. */
export default function ReferralsToolbar({
  search,
  setSearch,
  status,
  setStatus,
  agentId,
  setAgentId,
  limit,
  setLimit,
  tab,
  setTab,
  selectedCount = 0,
  onBulkAction,
  mayArchive = false,
}) {
  const isArchived = tab === ARCHIVE_TABS.ARCHIVED;
  const [draft, setDraft] = useDebouncedParam(search, setSearch);
  const statusFilter = useEnumFilter(REFERRAL_STATUSES, formatReferralStatus, ALL_STATUS);

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
            placeholder="Search RF-1001, client name, email or phone..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_STATUS}
            value={statusFilter.labelFor(status)}
            options={statusFilter.options}
            onChange={(label) => setStatus?.(statusFilter.valueByLabel[label] ?? "")}
          />
          <ReferralAgentPicker
            variant="filter"
            value={agentId}
            onChange={(id) => setAgentId?.(id || "")}
            placeholder={ALL_AGENTS}
            allowClear
            clearLabel={ALL_AGENTS}
          />
          <PageSizeSelect value={limit} onChange={setLimit} />
        </div>
        {mayArchive && (
          <BulkDeleteButton
            count={selectedCount}
            itemLabel="referrals"
            onClick={onBulkAction}
            action={isArchived ? "restore" : "remove"}
          />
        )}
      </div>
    </div>
  );
}

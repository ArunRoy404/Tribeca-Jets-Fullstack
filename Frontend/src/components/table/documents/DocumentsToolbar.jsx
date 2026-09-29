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
import { ARCHIVE_TABS } from "@/lib/archive";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_OWNERS,
  EXPIRY_STATES,
  formatDocumentCategory,
  formatDocumentOwner,
  formatExpiry,
} from "@/lib/document";

const TAB_LABELS = { [ARCHIVE_TABS.LIVE]: "Documents", [ARCHIVE_TABS.ARCHIVED]: "Archived" };
const TAB_IDS = Object.fromEntries(Object.entries(TAB_LABELS).map(([id, label]) => [label, id]));
const ALL_CATEGORIES = "All Categories";
const ALL_FOLDERS = "All Folders";
const ANY_EXPIRY = "Any Expiry";

/** The vault's tabs and filters, all in the URL. Write controls only for a role that has them. */
export default function DocumentsToolbar({ params, selectedCount = 0, onBulkAction, onAdd, mayManage = false }) {
  const isArchived = params.tab === ARCHIVE_TABS.ARCHIVED;
  const [draft, setDraft] = useDebouncedParam(params.search, params.setSearch);
  const category = useEnumFilter(DOCUMENT_CATEGORIES, formatDocumentCategory, ALL_CATEGORIES);
  const owner = useEnumFilter(DOCUMENT_OWNERS, formatDocumentOwner, ALL_FOLDERS);
  const expiry = useEnumFilter(EXPIRY_STATES, formatExpiry, ANY_EXPIRY);

  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <FilterTabs
        options={Object.values(TAB_LABELS)}
        value={TAB_LABELS[params.tab] ?? TAB_LABELS[ARCHIVE_TABS.LIVE]}
        onValueChange={(label) => params.setTab?.(TAB_IDS[label] ?? ARCHIVE_TABS.LIVE)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            size="sm"
            placeholder="Search title, file, client, TJ-number..."
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          <FilterDropdown
            label={ALL_FOLDERS}
            value={owner.labelFor(params.owner)}
            options={owner.options}
            onChange={(label) => params.setOwner?.(owner.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ALL_CATEGORIES}
            value={category.labelFor(params.category)}
            options={category.options}
            onChange={(label) => params.setCategory?.(category.valueByLabel[label] ?? "")}
          />
          <FilterDropdown
            label={ANY_EXPIRY}
            value={expiry.labelFor(params.expiry)}
            options={expiry.options}
            onChange={(label) => params.setExpiry?.(expiry.valueByLabel[label] ?? "")}
          />
          <PageSizeSelect value={params.limit} onChange={params.setLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mayManage && (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="documents"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          )}
          {mayManage && !isArchived && (
            <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onAdd?.()}>
              <Plus className="size-3.5" />
              <span>File a Document</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

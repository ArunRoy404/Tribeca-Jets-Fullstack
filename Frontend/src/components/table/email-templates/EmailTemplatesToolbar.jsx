"use client";

import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import FilterTabs from "@/components/table/common/FilterTabs";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import BulkDeleteButton from "@/components/table/common/BulkDeleteButton";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import {
  EMAIL_STATUSES,
  EMAIL_TABS,
  EMAIL_TEMPLATE_CATEGORIES,
  TEMPLATE_ACTIVITY,
  formatEmailCategory,
  formatEmailStatus,
  formatTemplateActivity,
} from "@/lib/email";

const ALL_STATUS = "All Status";
const ALL_CATEGORIES = "All Categories";
const TAB_LABELS = { [EMAIL_TABS.LIVE]: "Templates", [EMAIL_TABS.SENT]: "Sent", [EMAIL_TABS.ARCHIVED]: "Archived" };
const TAB_IDS = Object.fromEntries(Object.entries(TAB_LABELS).map(([id, label]) => [label, id]));

/** The screen's tabs and filters, all in the URL. Write controls only for a role that has them. */
export default function EmailTemplatesToolbar({
  params,
  selectedCount = 0,
  onBulkAction,
  onSendEmail,
  onNewTemplate,
  mayManage = false,
  maySend = false,
  showSentTab = false,
}) {
  const { tab } = params;
  const isArchived = tab === EMAIL_TABS.ARCHIVED;
  const isSent = tab === EMAIL_TABS.SENT;
  const [draft, setDraft] = useDebouncedParam(params.search, params.setSearch);
  const activity = useEnumFilter(TEMPLATE_ACTIVITY, formatTemplateActivity, ALL_STATUS);
  const category = useEnumFilter(EMAIL_TEMPLATE_CATEGORIES, formatEmailCategory, ALL_CATEGORIES);
  const status = useEnumFilter(EMAIL_STATUSES, formatEmailStatus, ALL_STATUS);
  const tabs = Object.entries(TAB_LABELS)
    .filter(([id]) => showSentTab || id !== EMAIL_TABS.SENT)
    .map(([, label]) => label);

  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <FilterTabs
        options={tabs}
        value={TAB_LABELS[tab] ?? TAB_LABELS[EMAIL_TABS.LIVE]}
        onValueChange={(label) => params.setTab?.(TAB_IDS[label] ?? EMAIL_TABS.LIVE)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            size="sm"
            placeholder={isSent ? "Search subject or recipient..." : "Search templates..."}
            value={draft ?? ""}
            onChange={(e) => setDraft?.(e.target.value)}
          />
          {isSent ? (
            <FilterDropdown
              label={ALL_STATUS}
              value={status.labelFor(params.status)}
              options={status.options}
              onChange={(label) => params.setStatus?.(status.valueByLabel[label] ?? "")}
            />
          ) : (
            <>
              {!isArchived && (
                <FilterDropdown
                  label={ALL_STATUS}
                  value={activity.labelFor(params.active)}
                  options={activity.options}
                  onChange={(label) => params.setActive?.(activity.valueByLabel[label] ?? "")}
                />
              )}
              <FilterDropdown
                label={ALL_CATEGORIES}
                value={category.labelFor(params.category)}
                options={category.options}
                onChange={(label) => params.setCategory?.(category.valueByLabel[label] ?? "")}
              />
            </>
          )}
          <PageSizeSelect value={params.limit} onChange={params.setLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mayManage && !isSent && (
            <BulkDeleteButton
              count={selectedCount}
              itemLabel="templates"
              onClick={onBulkAction}
              action={isArchived ? "restore" : "remove"}
            />
          )}
          {maySend && !isArchived && (
            <Button variant="secondary" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onSendEmail?.()}>
              <Mail className="size-3.5" />
              <span>Send Email</span>
            </Button>
          )}
          {mayManage && !isArchived && !isSent && (
            <Button variant="outline" size="sm" className="px-3 sm:px-4 gap-2" onClick={() => onNewTemplate?.()}>
              <Plus className="size-3.5" />
              <span>New Template</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

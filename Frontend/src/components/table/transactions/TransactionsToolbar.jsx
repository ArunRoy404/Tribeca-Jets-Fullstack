"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import DatePicker from "@/components/common/DatePicker";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import { MOVEMENT_KINDS, formatMovementKind } from "@/lib/transaction";

const ALL_KINDS = "All Types";
const ORDER = { desc: "Newest first", asc: "Oldest first" };
const ORDER_BY_LABEL = Object.fromEntries(Object.entries(ORDER).map(([value, label]) => [label, value]));

/**
 * The ledger's filters, all in the URL: search, type, a date range by the day
 * the money moved, and the order. There is no Add button and no bulk action —
 * the ledger is read-only; money is recorded on its bill. The old screen's
 * Record Payment and Delete are gone with the dummy data they wrote to.
 */
export default function TransactionsToolbar({
  search,
  setSearch,
  kind,
  setKind,
  from,
  setFrom,
  to,
  setTo,
  sortOrder,
  setSortOrder,
  limit,
  setLimit,
  hasFilters,
  onClear,
}) {
  const [draft, setDraft] = useDebouncedParam(search, setSearch);
  const kindFilter = useEnumFilter(MOVEMENT_KINDS, formatMovementKind, ALL_KINDS);

  return (
    <div className="relative flex flex-col gap-3 p-4 w-full bg-sidebar border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          size="sm"
          placeholder="Search INV-, OP-, COM-, TJ- or a name..."
          value={draft ?? ""}
          onChange={(e) => setDraft?.(e.target.value)}
        />
        <FilterDropdown
          label={ALL_KINDS}
          value={kindFilter.labelFor(kind)}
          options={kindFilter.options}
          onChange={(label) => setKind?.(kindFilter.valueByLabel[label] ?? "")}
        />
        <FilterDropdown
          label={ORDER.desc}
          value={ORDER[sortOrder] ?? ORDER.desc}
          options={Object.values(ORDER)}
          onChange={(label) => setSortOrder?.(ORDER_BY_LABEL[label] ?? "desc")}
        />
        <PageSizeSelect value={limit} onChange={setLimit} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-44">
          <DatePicker value={from} onChange={(value) => setFrom?.(value ?? "")} placeholder="From" />
        </div>
        <div className="w-full sm:w-44">
          <DatePicker value={to} onChange={(value) => setTo?.(value ?? "")} placeholder="To" />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClear}>
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

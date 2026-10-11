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
 * the money moved, and the order. All controls match the compact toolbar pill style
 * with mutual From/To date validation.
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

  const isRangeInvalid = Boolean(from && to && from > to);

  const handleFromChange = (value) => {
    setFrom?.(value ?? "");
  };

  const handleToChange = (value) => {
    setTo?.(value ?? "");
  };

  return (
    <div className="relative flex flex-col gap-2 p-3 sm:p-4 w-full bg-sidebar border-b border-border">
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
        <div className="flex items-center gap-1.5 shrink-0">
          <DatePicker
            size="sm"
            value={from}
            maxDate={to || undefined}
            onChange={handleFromChange}
            placeholder="From"
            className={isRangeInvalid ? "border-destructive text-destructive" : ""}
          />
          <span className="text-[10px] text-muted-foreground font-medium">to</span>
          <DatePicker
            size="sm"
            value={to}
            minDate={from || undefined}
            onChange={handleToChange}
            placeholder="To"
            className={isRangeInvalid ? "border-destructive text-destructive" : ""}
          />
        </div>
        <FilterDropdown
          label={ORDER.desc}
          value={ORDER[sortOrder] ?? ORDER.desc}
          options={Object.values(ORDER)}
          onChange={(label) => setSortOrder?.(ORDER_BY_LABEL[label] ?? "desc")}
        />
        <PageSizeSelect value={limit} onChange={setLimit} />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1 px-2 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            onClick={onClear}
          >
            <X className="size-3" />
            Clear filters
          </Button>
        )}
      </div>

      {isRangeInvalid && (
        <p className="font-montserrat text-[11px] font-medium text-destructive">
          From date ({from}) must be on or before To date ({to}).
        </p>
      )}
    </div>
  );
}


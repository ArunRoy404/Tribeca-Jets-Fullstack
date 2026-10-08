"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { PAGE_GAP, buildPageItems } from "@/lib/pagination";
import { cn } from "@/lib/utils";

/** A hook that fetches nothing — the stand-in when no `useOne` is given. */
const useNothing = () => ({ data: undefined });

/**
 * Picks one record from a server-paged list — the one dropdown every form
 * uses to choose an airport, an operator, a client, a broker (owner's design,
 * 8 Oct 2026). Search is always there, 10 rows a page by default, with page
 * numbers and a page-size choice, all answered by the server — so it works
 * the same for 5 records or 5,000, with no cap.
 *
 * It knows nothing about any module. The module hands it its own hooks:
 *
 *   <RecordPicker
 *     value={airportId}
 *     onChange={(id, record) => …}
 *     useList={useAirports}   // (params, options) → query of `{ data, meta }`
 *     useOne={useAirport}     // optional: (id, options) → query of one record
 *     params={{ sortBy: "icao", sortOrder: "asc" }}   // fixed filters / sort
 *     getOption={(a) => ({ value: a.id, label: `${a.icao} · ${a.name}`, description: a.city })}
 *     itemLabel="airports"
 *   />
 *
 * so paging, search and caching stay in the module's React Query hook, with
 * its keys and presets, and the list is whatever the API lets the caller see
 * (a broker's own clients, live airports). `useList` and `useOne` must be
 * module-level hooks — the same function every render.
 *
 * `useOne` resolves a value the open pages have not shown yet — an edit form
 * opening on a saved id — so the trigger shows a label, never a raw id.
 *
 * Search, page and page size are the popup's own disposable state, not URL
 * state: a dropdown is not a view anyone links to.
 */
export default function RecordPicker({
  value,
  onChange,
  useList,
  useOne,
  params,
  getOption,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  itemLabel = "records",
  disabled = false,
  invalid = false,
  className,
  id,
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [active, setActive] = useState(0);
  // The option last picked here, so the trigger keeps its label after the
  // page that held it is gone.
  const [picked, setPicked] = useState(null);
  const listRef = useRef(null);

  const commitSearch = useCallback((next) => {
    setSearch(next);
    setPage(1);
    setActive(0);
  }, []);
  const [draft, setDraft] = useDebouncedParam(search, commitSearch);

  const query = useMemo(
    () => ({ ...params, page, limit, ...(search.trim() ? { search: search.trim() } : {}) }),
    [params, page, limit, search],
  );
  const list = useList(query, { enabled: open });
  const rows = list?.data?.data;
  const meta = list?.data?.meta;
  const options = useMemo(() => (rows ?? []).map(getOption), [rows, getOption]);
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);

  // A saved id the open pages have not shown: ask for that one record.
  const known =
    (picked?.value === value ? picked : null) ?? options.find((option) => option.value === value) ?? null;
  const useSelected = useOne ?? useNothing;
  const one = useSelected(value, { enabled: Boolean(value) && !known });
  const selected = known ?? (one?.data ? getOption(one.data) : null);

  const choose = (option) => {
    setPicked(option);
    onChange?.(option.value, rows?.find((row) => getOption(row).value === option.value));
    setOpen(false);
  };

  const goTo = (next) => {
    setPage(Math.min(Math.max(next, 1), pageCount));
    setActive(0);
    listRef.current?.scrollTo?.({ top: 0 });
  };

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) {
      // A fresh list next time; the page size is a preference and stays.
      setDraft("");
      commitSearch("");
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (event.key === "PageDown" && page < pageCount) {
      event.preventDefault();
      goTo(page + 1);
    } else if (event.key === "PageUp" && page > 1) {
      event.preventDefault();
      goTo(page - 1);
    }
  };

  // Keep the highlighted row in view while arrowing through a long page.
  useEffect(() => {
    listRef.current?.querySelector?.(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const first = meta?.total ? (page - 1) * limit + 1 : 0;
  const last = meta?.total ? Math.min(page * limit, meta.total) : 0;
  const loading = list?.isPending && open;
  const refreshing = list?.isFetching && !loading;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-13 w-full items-center justify-between gap-2 rounded-sm border border-input bg-white px-4 text-left font-montserrat text-base font-medium outline-none cursor-pointer",
          "focus-visible:ring-1 focus-visible:ring-purple data-popup-open:ring-1 data-popup-open:ring-purple",
          "disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive",
          className,
        )}
      >
        <span className={cn("min-w-0 truncate", !selected && "text-muted-foreground font-normal")}>
          {selected?.label ?? (value && one?.isPending ? "Loading…" : placeholder)}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-72 max-w-[calc(100vw-2rem)] gap-0 p-0 overflow-hidden"
      >
        {/* Search — always shown. The popup focuses its first focusable
            element on open, which is this field. */}
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={draft ?? ""}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            aria-controls={listId}
            aria-activedescendant={options[active] ? `${listId}-${active}` : undefined}
            className="h-10 w-full bg-transparent font-montserrat text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          {refreshing ? <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" /> : null}
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className={cn("max-h-72 overflow-y-auto p-1 transition-opacity", refreshing && "opacity-60")}
        >
          {loading ? (
            Array.from({ length: Math.min(limit, 6) }, (_, index) => (
              <div key={index} className="flex flex-col gap-1.5 px-2.5 py-2">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            ))
          ) : list?.error ? (
            <div className="flex flex-col items-start gap-2 px-2.5 py-3 font-montserrat text-[12px] text-destructive">
              {list.error.message ?? `Could not load ${itemLabel}.`}
              <button type="button" onClick={() => list.refetch?.()} className="font-medium text-foreground underline">
                Try again
              </button>
            </div>
          ) : options.length === 0 ? (
            <p className="px-2.5 py-3 font-montserrat text-[12px] text-muted-foreground">
              {search.trim() ? `No ${itemLabel} match “${search.trim()}”.` : `No ${itemLabel} yet.`}
            </p>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left cursor-pointer",
                    index === active && "bg-secondary",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-montserrat text-[13px] font-medium text-foreground">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="truncate font-montserrat text-[11px] text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? <Check className="mt-0.5 size-4 shrink-0 text-purple" /> : null}
                </button>
              );
            })
          )}
        </div>

        {/* Footer: where you are, how many a page, and the pages. */}
        <div className="flex flex-col gap-2 border-t border-border px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-montserrat text-[11px] text-muted-foreground">
              {meta ? `${first}–${last} of ${meta.total} ${itemLabel}` : " "}
            </span>
            <div className="flex items-center gap-1" role="group" aria-label="Rows per page">
              <span className="mr-1 font-montserrat text-[11px] text-muted-foreground">Show</span>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={limit === size}
                  onClick={() => {
                    setLimit(size);
                    goTo(1);
                  }}
                  className={cn(
                    "h-6 min-w-7 rounded-sm px-1.5 font-montserrat text-[11px] font-medium cursor-pointer",
                    limit === size ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {pageCount > 1 ? (
            <div className="flex items-center justify-center gap-1">
              <PagerButton label="Previous page" disabled={page <= 1} onClick={() => goTo(page - 1)}>
                <ChevronLeft className="size-3.5" />
              </PagerButton>
              {buildPageItems(page, pageCount, { boundaries: 1, siblings: 1 }).map((item, index) =>
                item === PAGE_GAP ? (
                  <span key={`gap-${index}`} className="w-6 text-center font-montserrat text-[11px] text-muted-foreground">
                    {PAGE_GAP}
                  </span>
                ) : (
                  <PagerButton
                    key={item}
                    label={`Page ${item}`}
                    current={item === page}
                    onClick={() => goTo(item)}
                  >
                    {item}
                  </PagerButton>
                ),
              )}
              <PagerButton label="Next page" disabled={page >= pageCount} onClick={() => goTo(page + 1)}>
                <ChevronRight className="size-3.5" />
              </PagerButton>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PagerButton({ label, current = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled || current}
      onClick={onClick}
      className={cn(
        "flex size-6 items-center justify-center rounded-sm font-montserrat text-[11px] font-medium",
        current
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-secondary cursor-pointer disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

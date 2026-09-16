import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_GAP, buildPageItems } from "@/lib/pagination";

/**
 * The footer under every table.
 *
 * Renders real page numbers, not just the current one — with the first and
 * last pages pinned and the middle collapsed to an ellipsis once there are
 * enough pages to need it. See `buildPageItems` for the windowing.
 *
 * `onPageChange` is optional. Tables that are still dummy-backed only know how
 * to step one page at a time, so without it the numbers render as plain labels
 * and Prev/Next stay the only controls. Passing it turns them into jumps.
 */
export default function TablePagination({
  totalCount,
  itemLabel = "items",
  page,
  pageCount,
  onPrev,
  onNext,
  onPageChange,
}) {
  const current = Math.max(Number(page) || 1, 1);
  const total = Math.max(Number(pageCount) || 1, 1);
  const items = buildPageItems(current, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 w-full">
      <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
        {totalCount} {itemLabel} · Page {current} of {total}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={current <= 1}
          onClick={onPrev}
          className="gap-1"
        >
          <ChevronLeft className="size-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        {items.map((item, index) =>
          item === PAGE_GAP ? (
            // The key carries the index because two gaps can appear in one
            // pager and "…" alone would not be unique.
            <span
              key={`gap-${index}`}
              className="flex items-center justify-center size-6 font-montserrat font-medium text-[12px] text-muted-foreground select-none"
            >
              {PAGE_GAP}
            </span>
          ) : (
            <PageNumber
              key={item}
              page={item}
              isCurrent={item === current}
              onSelect={onPageChange}
            />
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={current >= total}
          onClick={onNext}
          className="gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

const BOX_CLASS =
  "flex items-center justify-center size-6 rounded-sm font-montserrat font-medium text-[12px] shrink-0";

function PageNumber({ page, isCurrent, onSelect }) {
  // The current page is never a button: it is state, not an action, and making
  // it clickable invites a pointless refetch of the page already shown.
  if (isCurrent || !onSelect) {
    return (
      <span
        className={`${BOX_CLASS} ${
          isCurrent
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground"
        }`}
        aria-current={isCurrent ? "page" : undefined}
      >
        {page}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(page)}
      aria-label={`Go to page ${page}`}
      className={`${BOX_CLASS} border border-border text-foreground cursor-pointer transition-colors hover:bg-secondary`}
    >
      {page}
    </button>
  );
}

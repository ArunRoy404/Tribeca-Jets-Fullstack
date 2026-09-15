/**
 * The page numbers a pager should render, with gaps collapsed.
 *
 * A pager cannot list 200 pages, and it cannot list only the current one
 * either — the user needs to see where they are, how far it goes, and be able
 * to jump. So: the first and last few pages are always shown, a window follows
 * the current page, and anything between becomes an ellipsis.
 *
 * Pure and exported separately from the component so the windowing is testable
 * on its own, and so any pager reuses this rather than re-deriving it.
 *
 * @param page       Current page, 1-based. Clamped into range.
 * @param pageCount  Total pages, from the server's `meta.totalPages`.
 * @param boundaries How many pages to pin at each end.
 * @param siblings   How many pages to show either side of the current one.
 * @returns Array of page numbers and `PAGE_GAP` markers.
 *
 * @example buildPageItems(10, 20) // [1, 2, "…", 9, 10, 11, "…", 19, 20]
 * @example buildPageItems(1, 2)   // [1, 2]
 */
export const PAGE_GAP = "…";

export function buildPageItems(page, pageCount, { boundaries = 2, siblings = 1 } = {}) {
  const total = Math.max(Math.trunc(Number(pageCount)) || 1, 1);
  const current = Math.min(Math.max(Math.trunc(Number(page)) || 1, 1), total);

  // What the pager would render with nothing collapsed: both boundaries, the
  // sibling window, and the two ellipses that would have replaced the gaps.
  // Below this there is nothing to collapse, so show every page.
  const maxSlots = boundaries * 2 + siblings * 2 + 3;
  if (total <= maxSlots) return range(1, total);

  let left = current - siblings;
  let right = current + siblings;

  // Near an end the window would hang off the edge. Slide it back inward
  // instead of truncating, so the pager keeps a constant width as the user
  // pages through rather than shrinking at the extremes.
  if (left < boundaries + 1) {
    right += boundaries + 1 - left;
    left = boundaries + 1;
  }
  if (right > total - boundaries) {
    left -= right - (total - boundaries);
    right = total - boundaries;
  }
  left = Math.max(left, boundaries + 1);
  right = Math.min(right, total - boundaries);

  return [
    ...range(1, boundaries),
    ...(left > boundaries + 1 ? [PAGE_GAP] : []),
    ...range(left, right),
    ...(right < total - boundaries ? [PAGE_GAP] : []),
    ...range(total - boundaries + 1, total),
  ];
}

function range(from, to) {
  if (to < from) return [];
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

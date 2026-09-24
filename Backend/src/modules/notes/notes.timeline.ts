/**
 * Merging two ordered sources into one page.
 *
 * Pulled out of the service and made pure for the same reason the uploads
 * access rule was: the interesting failure here is off-by-one across a page
 * boundary, and a paginated merge that is only ever exercised by opening a
 * screen with four entries on it is a merge nobody has actually tested.
 */

/** The minimum a row needs to take its place on the timeline. */
export interface TimelineRow {
  id: string;
  createdAt: Date;
}

/**
 * Newest first, and stable.
 *
 * Two rows written in the same millisecond — a status change and the note
 * explaining it — would otherwise be free to swap places between one page and
 * the next, which is how a paginated merge shows one entry twice and silently
 * hides another. The id settles the tie here, and the same tie is settled the
 * same way by the `[{ createdAt: 'desc' }, { id: 'desc' }]` ordering both
 * queries use, so the merge never disagrees with the windows it was given.
 */
export function newestFirst(a: TimelineRow, b: TimelineRow): number {
  const byTime = b.createdAt.getTime() - a.createdAt.getTime();
  return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
}

/**
 * The page of the combined timeline, from the newest `skip + take` rows of
 * each source.
 *
 * **Exact, not an approximation.** The nth newest row overall cannot be older
 * than the nth newest row of either source, so taking `skip + take` from each
 * always covers the window that is about to be sliced out. It over-fetches on
 * deep pages, which a timeline does not have — and the alternative, a raw
 * UNION, would put a hand-written query where the row-level rule lives, which
 * is the one place this project keeps readable.
 *
 * Callers must pass sources already ordered newest-first and already limited
 * to at least `skip + take` rows, which is what the service's two queries do.
 */
export function mergeTimeline<A extends TimelineRow, B extends TimelineRow>(
  notes: A[],
  events: B[],
  skip: number,
  take: number,
): (A | B)[] {
  return [...notes, ...events].sort(newestFirst).slice(skip, skip + take);
}

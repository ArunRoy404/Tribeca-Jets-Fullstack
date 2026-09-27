/**
 * One page of several ordered sources, merged — the notes timeline (notes and
 * audit events) and the Transactions ledger (client payments, operator
 * payments, paid commissions). Lifted out of `notes.timeline.ts` when
 * Transactions became its second caller.
 *
 * **Exact, not an approximation.** The nth row overall cannot sit later than
 * the nth row of any one source, so taking `skip + take` rows from each source
 * always covers the window about to be sliced out. It over-fetches on deep
 * pages, which neither screen has — and the alternative, a hand-written
 * UNION, would put raw SQL where each module's row-level rule lives, which is
 * the one place this project keeps readable.
 *
 * Callers pass every source already ordered by the same `compare` and already
 * limited to at least `skip + take` rows. `compare` must break ties (by id),
 * or two rows written in the same millisecond can swap between pages — one
 * shown twice, another never.
 */
export function mergePages<T>(sources: T[][], skip: number, take: number, compare: (a: T, b: T) => number): T[] {
  return sources.flat().sort(compare).slice(skip, skip + take);
}

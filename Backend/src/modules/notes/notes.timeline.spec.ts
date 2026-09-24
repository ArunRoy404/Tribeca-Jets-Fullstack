import { describe, expect, it } from 'vitest';
import { mergeTimeline, newestFirst } from './notes.timeline.js';

const at = (iso: string, id: string) => ({ id, createdAt: new Date(iso) });

/** Newest-first, the order both queries and the merge agree on. */
const order = <T extends { id: string; createdAt: Date }>(rows: T[]) =>
  [...rows].sort(newestFirst);

describe('newestFirst', () => {
  it('puts the newer row first', () => {
    const older = at('2026-09-01T10:00:00Z', 'a');
    const newer = at('2026-09-02T10:00:00Z', 'b');
    expect(order([older, newer]).map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('breaks a same-millisecond tie by id, so the order never wobbles', () => {
    const one = at('2026-09-01T10:00:00Z', 'aaa');
    const two = at('2026-09-01T10:00:00Z', 'zzz');
    expect(order([one, two]).map((r) => r.id)).toEqual(['zzz', 'aaa']);
    // The same input in the other order must produce the same output. Without
    // the tie-break this is where a row appears on two consecutive pages.
    expect(order([two, one]).map((r) => r.id)).toEqual(['zzz', 'aaa']);
  });
});

describe('mergeTimeline', () => {
  // Nine rows alternating between the two sources, newest last in real time.
  const notes = order([
    at('2026-09-09T00:00:00Z', 'n9'),
    at('2026-09-07T00:00:00Z', 'n7'),
    at('2026-09-05T00:00:00Z', 'n5'),
    at('2026-09-03T00:00:00Z', 'n3'),
    at('2026-09-01T00:00:00Z', 'n1'),
  ]);
  const events = order([
    at('2026-09-08T00:00:00Z', 'e8'),
    at('2026-09-06T00:00:00Z', 'e6'),
    at('2026-09-04T00:00:00Z', 'e4'),
    at('2026-09-02T00:00:00Z', 'e2'),
  ]);
  const expected = ['n9', 'e8', 'n7', 'e6', 'n5', 'e4', 'n3', 'e2', 'n1'];

  /** What the service does: take `skip + take` from each source, then merge. */
  const page = (skip: number, take: number) =>
    mergeTimeline(
      notes.slice(0, skip + take),
      events.slice(0, skip + take),
      skip,
      take,
    ).map((row) => row.id);

  it('interleaves both sources by time', () => {
    expect(page(0, 9)).toEqual(expected);
  });

  it('pages exactly, with no row repeated and none skipped', () => {
    // The whole point: walking the pages must reproduce the full list. A merge
    // that under-fetches loses a row here rather than anywhere visible.
    const walked = [...page(0, 4), ...page(4, 4), ...page(8, 4)];
    expect(walked).toEqual(expected);
  });

  it('covers the window even when one source holds every row in it', () => {
    // Page 2 of a subject whose five newest entries are all notes. Taking only
    // `take` rows from each source instead of `skip + take` would return e8
    // here and drop n5 for good.
    expect(page(2, 2)).toEqual(['n7', 'e6']);
  });

  it('returns an empty page past the end rather than throwing', () => {
    expect(page(20, 10)).toEqual([]);
  });

  it('works when one source is empty', () => {
    expect(mergeTimeline(notes, [], 0, 3).map((r) => r.id)).toEqual([
      'n9',
      'n7',
      'n5',
    ]);
    expect(mergeTimeline([], events, 0, 2).map((r) => r.id)).toEqual([
      'e8',
      'e6',
    ]);
  });
});

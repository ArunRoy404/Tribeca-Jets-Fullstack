import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createNoteSchema,
  queryNotesSchema,
  queryTimelineSchema,
  updateNoteSchema,
} from './note.dto.js';

const SUBJECT = {
  subjectType: 'CLIENT',
  subjectId: '11111111-1111-4111-8111-111111111111',
};

describe('createNoteSchema', () => {
  it('defaults a note to INTERNAL', () => {
    const parsed = createNoteSchema.parse({ ...SUBJECT, body: 'Called them.' });
    expect(parsed.visibility).toBe('INTERNAL');
  });

  it('refuses a note that is only whitespace', () => {
    expect(createNoteSchema.safeParse({ ...SUBJECT, body: '   ' }).success).toBe(
      false,
    );
  });

  it('refuses a runaway paste', () => {
    const ok = createNoteSchema.safeParse({ ...SUBJECT, body: 'x'.repeat(5000) });
    const tooLong = createNoteSchema.safeParse({
      ...SUBJECT,
      body: 'x'.repeat(5001),
    });
    expect(ok.success).toBe(true);
    expect(tooLong.success).toBe(false);
  });

  it('requires a subject — there is no unscoped note', () => {
    expect(createNoteSchema.safeParse({ body: 'orphan' }).success).toBe(false);
  });
});

describe('updateNoteSchema', () => {
  it('refuses an empty body', () => {
    // This shipped accepting `{}`, which answered 200 with the note unchanged
    // and stamped `updatedById` — a write that reported success, did nothing,
    // and claimed an edit nobody made.
    expect(updateNoteSchema.safeParse({}).success).toBe(false);
  });

  it('accepts either field alone', () => {
    expect(updateNoteSchema.safeParse({ body: 'revised' }).success).toBe(true);
    expect(updateNoteSchema.safeParse({ visibility: 'SHARED' }).success).toBe(
      true,
    );
  });

  it('never fills a default, so an edit cannot republish a private note', () => {
    // The reason this is written longhand rather than with `.partial()`:
    // `.partial()` keeps `.default()`, so an edit that did not mention
    // visibility would arrive carrying INTERNAL — or, on any future field,
    // silently overwrite what was stored.
    const parsed = updateNoteSchema.parse({ body: 'revised' });
    expect(parsed).not.toHaveProperty('visibility');
  });
});

describe('queryTimelineSchema', () => {
  it('refuses a filter it does not honour', () => {
    // `?search=` works on GET /notes and does nothing here. Stripping it
    // silently told the caller their filter had been applied.
    expect(
      queryTimelineSchema.safeParse({ ...SUBJECT, search: 'Citation' }).success,
    ).toBe(false);
    expect(
      queryTimelineSchema.safeParse({ ...SUBJECT, sortBy: 'createdAt' }).success,
    ).toBe(false);
    expect(
      queryTimelineSchema.safeParse({ ...SUBJECT, sortOrder: 'asc' }).success,
    ).toBe(false);
  });

  it('still takes paging and the half-selector', () => {
    const parsed = queryTimelineSchema.parse({
      ...SUBJECT,
      page: '2',
      limit: '5',
      entries: 'NOTE',
    });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(5);
    expect(parsed.entries).toBe('NOTE');
  });
});

describe('queryNotesSchema', () => {
  it('does honour search and an allowlisted sort', () => {
    const parsed = queryNotesSchema.parse({
      ...SUBJECT,
      search: 'Citation',
      sortBy: 'updatedAt',
    });
    expect(parsed.search).toBe('Citation');
    expect(parsed.sortBy).toBe('updatedAt');
  });

  it('refuses a column outside the allowlist', () => {
    expect(
      queryNotesSchema.safeParse({ ...SUBJECT, sortBy: 'body' }).success,
    ).toBe(false);
  });

  it('defaults to live notes, newest first', () => {
    const parsed = queryNotesSchema.parse(SUBJECT);
    expect(parsed.archived).toBe(false);
    expect(parsed.sortBy).toBe('createdAt');
    expect(parsed.sortOrder).toBe('desc');
  });
});

describe('every notes DTO can describe itself', () => {
  // A DTO that cannot be expressed as JSON Schema takes the whole /api/docs
  // page down with a bogus circular-dependency error. `z.date()` and
  // `z.coerce.date()` both do this, and the failure appears nowhere near the
  // DTO that caused it.
  it.each([
    ['createNoteSchema', createNoteSchema],
    ['updateNoteSchema', updateNoteSchema],
    ['queryNotesSchema', queryNotesSchema],
    ['queryTimelineSchema', queryTimelineSchema],
  ])('%s', (_name, schema) => {
    expect(() =>
      z.toJSONSchema(schema as never, { io: 'input' }),
    ).not.toThrow();
  });
});

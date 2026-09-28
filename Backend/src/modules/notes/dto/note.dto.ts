import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import {
  NoteSubjectType,
  NoteVisibility,
} from '../../../generated/prisma/enums.js';

/**
 * A paste accident, not a policy.
 *
 * Long notes are legitimate — a broker pastes an email thread — so this is set
 * where a runaway paste is caught and ordinary use never reaches it. The column
 * is `Text` and imposes no limit of its own.
 */
const BODY_MAX = 5_000;

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const NOTE_SORTABLE_FIELDS = ['createdAt', 'updatedAt'] as const;

/**
 * Which record's timeline. Both are required on every read and every write:
 * there is no "all notes" endpoint, because a note is only ever meaningful
 * beside the record it is about, and an unscoped list would be the one query
 * that ignores the row-level rule the subject carries.
 */
const subjectSchema = z.object({
  subjectType: z.enum(NoteSubjectType),
  subjectId: z.uuid('Choose which record this note is about'),
});

export const queryNotesSchema = paginationSchema
  .extend(subjectSchema.shape)
  .extend({
    visibility: z.enum(NoteVisibility).optional(),
    sortBy: sortableBy(NOTE_SORTABLE_FIELDS),
  })
  .extend(archiveQuerySchema.shape);

export type QueryNotesInput = z.infer<typeof queryNotesSchema>;
export class QueryNotesDto extends createZodDto(queryNotesSchema) {}

/**
 * The merged view: notes and the audit entries about the same record, in one
 * order.
 *
 * No `archived` param, deliberately. The timeline answers "what happened to
 * this record", and an archived note is one somebody withdrew — mixing those
 * back in beside the events they were withdrawn from would say the opposite.
 * The Archived half is `GET /notes?archived=true`, which is a list rather than
 * a timeline.
 */
export const queryTimelineSchema = paginationSchema
  // `search`, `sortBy` and `sortOrder` are deliberately dropped rather than
  // inherited. A timeline is a chronological reading view and is *always*
  // newest-first, so honouring none of the three is correct.
  .omit({ search: true, sortBy: true, sortOrder: true })
  .extend(subjectSchema.shape)
  .extend({
    /**
     * `NOTE` for hand-written entries only, `EVENT` for the automatic trail.
     * Absent means both, which is the point of the endpoint.
     */
    entries: z.enum(['NOTE', 'EVENT']).optional(),
  })
  /**
   * The one query DTO in this project that refuses unknown keys, and it earns
   * it.
   *
   * Omitting the three fields above is not enough on its own: Zod strips an
   * unrecognised key rather than complaining, so `?search=Citation` still
   * answered 200 with the whole timeline. The caller filtered nothing and was
   * told it worked — which is exactly the wrong answer the `sortableBy`
   * allowlist exists to prevent one endpoint over.
   *
   * It matters *here* specifically because the sibling endpoint honours all
   * three: `GET /notes?search=` does filter. A parameter that works on one
   * route and is quietly dropped by its neighbour is the confusion worth
   * spending a 400 on.
   */
  .strict();

export type QueryTimelineInput = z.infer<typeof queryTimelineSchema>;
export class QueryTimelineDto extends createZodDto(queryTimelineSchema) {}

export const createNoteSchema = z.object({
  ...subjectSchema.shape,
  body: z
    .string()
    .trim()
    .min(1, 'Write something before saving the note')
    .max(BODY_MAX, `A note cannot be longer than ${BODY_MAX} characters`),
  /**
   * Defaults to INTERNAL. A note whose audience was not stated is desk
   * commentary; see the column comment for why that direction and not the
   * other.
   */
  visibility: z.enum(NoteVisibility).default(NoteVisibility.INTERNAL),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export class CreateNoteDto extends createZodDto(createNoteSchema) {}

/**
 * Written out longhand rather than `.partial()`, which keeps `.default()` and
 * would silently republish an internal note as shared on any edit that did not
 * mention visibility.
 *
 * The subject is absent on purpose: a note does not move between records. One
 * written about the wrong client is withdrawn and rewritten, which leaves the
 * mistake visible in the archive instead of erasing it.
 */
export const updateNoteSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, 'Write something before saving the note')
      .max(BODY_MAX, `A note cannot be longer than ${BODY_MAX} characters`)
      .optional(),
    visibility: z.enum(NoteVisibility).optional(),
  })
  // Every other module refuses an empty PATCH and this one did not, so `{}`
  // answered 200 with the note unchanged — a write that reports success and
  // does nothing. It also stamped `updatedById`, so the row claimed an edit
  // nobody made.
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export class UpdateNoteDto extends createZodDto(updateNoteSchema) {}

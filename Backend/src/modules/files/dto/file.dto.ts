import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { FileCategory } from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const FILE_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'filename',
  'size',
  'category',
] as const;

/**
 * A human label for the file, shown instead of the filename where one is given.
 *
 * Optional on purpose. A required label produces "document1", because the
 * filename is usually already the answer — "2025-1099-mark-reyes.pdf" needs no
 * second name typed beside it.
 */
const label = z.string().trim().min(1).max(200);
const notes = z.string().trim().max(5000);

/**
 * What accompanies the bytes on an upload.
 *
 * These arrive as multipart form fields, so every value reaches Zod as a
 * string — which is why `category` is a plain enum and the ids are `z.uuid()`
 * rather than anything that needs coercing. Nothing numeric or boolean is
 * accepted here, deliberately: `size` and `contentType` are read from the file
 * itself, never from the sender.
 */
export const uploadFileSchema = z
  .object({
    /**
     * What the file is for. This single field decides who may read it, who may
     * replace it and what formats are accepted — see `files.access.ts`.
     */
    category: z.enum(FileCategory),

    /** The user whose folder this belongs in. Required for USER_DOCUMENT. */
    ownerUserId: z.uuid().optional(),

    /** The tail this pictures. Required for AIRCRAFT_PHOTO. */
    aircraftId: z.uuid().optional(),

    label: label.optional(),
    notes: notes.optional(),
  })
  /**
   * The owner is checked here rather than in the service because it is a
   * property of the *request shape*, not of the database: a RESOURCE with an
   * `ownerUserId` is a malformed upload whatever rows exist. The service still
   * verifies the owner it names is real and live — that part needs the
   * database and belongs there.
   */
  .superRefine((value, ctx) => {
    const requiresUser = value.category === FileCategory.USER_DOCUMENT;
    const requiresAircraft = value.category === FileCategory.AIRCRAFT_PHOTO;

    if (requiresUser && !value.ownerUserId) {
      ctx.addIssue({
        code: 'custom',
        path: ['ownerUserId'],
        message: 'A personal document needs the user whose folder it belongs in',
      });
    }
    if (requiresAircraft && !value.aircraftId) {
      ctx.addIssue({
        code: 'custom',
        path: ['aircraftId'],
        message: 'An aircraft photo needs the aircraft it pictures',
      });
    }
    // The wrong owner is rejected rather than ignored. Silently dropping it
    // would store a company-wide brochure while the uploader believed they had
    // filed it against one broker.
    if (!requiresUser && value.ownerUserId) {
      ctx.addIssue({
        code: 'custom',
        path: ['ownerUserId'],
        message: `A ${value.category} file does not belong to a user`,
      });
    }
    if (!requiresAircraft && value.aircraftId) {
      ctx.addIssue({
        code: 'custom',
        path: ['aircraftId'],
        message: `A ${value.category} file does not belong to an aircraft`,
      });
    }
  });

/**
 * What may be changed after the fact.
 *
 * Only the two descriptive fields. The bytes, the category and the owner are
 * all immutable: re-categorising a stored file would move it between access
 * rules without anybody re-reading it, so replacing a document means uploading
 * a new one and archiving the old — which is also the only version history
 * this table has.
 *
 * Written out as its own object with every field optional rather than
 * `.partial()`, per AGENTS.md: `.partial()` keeps `.default()`, so an absent
 * field would arrive carrying a value and overwrite what is stored.
 */
export const updateFileSchema = z.object({
  label: label.nullable().optional(),
  notes: notes.nullable().optional(),
});

export const queryFilesSchema = paginationSchema
  .extend({
    /** Only files of this kind. Omit for every kind the caller may read. */
    category: z.enum(FileCategory).optional(),
    /** One user's personal folder. */
    ownerUserId: z.uuid().optional(),
    /** One aircraft's photographs. */
    aircraftId: z.uuid().optional(),
    sortBy: sortableBy(FILE_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type QueryFilesInput = z.infer<typeof queryFilesSchema>;

export class UploadFileDto extends createZodDto(uploadFileSchema) {}
export class UpdateFileDto extends createZodDto(updateFileSchema) {}
export class QueryFilesDto extends createZodDto(queryFilesSchema) {}

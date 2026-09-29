import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { uploadUrl } from '../../../common/dto/uploads.js';
import { paginationSchema, sortableBy } from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { DocumentCategory } from '../../../generated/prisma/enums.js';
import { EXPIRY_STATES } from '../documents.rules.js';

const title = z.string().trim().min(1, 'Give the document a title').max(200);
const notes = z.string().trim().max(5_000);

/** Which folder a document sits in. */
export const DOCUMENT_OWNERS = ['CLIENT', 'TRIP', 'OPERATOR'] as const;
export type DocumentOwner = (typeof DOCUMENT_OWNERS)[number];

/**
 * File a document. The file is uploaded first (`POST /uploads/document` or
 * `/uploads/image` — a passport scan is often a photo) and its returned URL
 * is sent here. Exactly one of `clientId`, `tripId` or `operatorId` says
 * whose folder it goes in.
 */
export const createDocumentSchema = z
  .object({
    title,
    category: z.enum(DocumentCategory).default(DocumentCategory.OTHER),
    fileUrl: uploadUrl,
    clientId: z.uuid().optional(),
    tripId: z.uuid().optional(),
    operatorId: z.uuid().optional(),
    /** A passport's or a certificate's expiry. Omit when it has none. */
    expiresOn: calendarDate.optional(),
    notes: notes.optional(),
  })
  .refine((value) => [value.clientId, value.tripId, value.operatorId].filter(Boolean).length === 1, {
    message: 'File the document on exactly one client, trip or operator',
    path: ['clientId'],
  });
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export class CreateDocumentDto extends createZodDto(createDocumentSchema) {}

/**
 * Written out rather than `.partial()` (AGENTS.md). The owner cannot be
 * changed: moving a document to another folder is archiving it and filing
 * it again, so each folder's history stays true. `fileUrl` replaces the file.
 */
export const updateDocumentSchema = z.object({
  title: title.optional(),
  category: z.enum(DocumentCategory).optional(),
  fileUrl: uploadUrl.optional(),
  expiresOn: calendarDate.nullable().optional(),
  notes: notes.nullable().optional(),
});
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export class UpdateDocumentDto extends createZodDto(updateDocumentSchema) {}

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const DOCUMENT_SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'category', 'expiresOn'] as const;

export const queryDocumentsSchema = paginationSchema
  .extend({
    sortBy: sortableBy(DOCUMENT_SORTABLE_FIELDS),
    category: z.enum(DocumentCategory).optional(),
    /** Which kind of folder: CLIENT, TRIP or OPERATOR. */
    owner: z.enum(DOCUMENT_OWNERS).optional(),
    clientId: z.uuid().optional(),
    tripId: z.uuid().optional(),
    operatorId: z.uuid().optional(),
    /** NONE (no expiry date), VALID, EXPIRING (within 90 days) or EXPIRED — worked out from `expiresOn` and `on`. */
    expiry: z.enum(EXPIRY_STATES).optional(),
    /** The desk's today, YYYY-MM-DD, for the expiry filter. Default today in UTC. */
    on: calendarDate.optional(),
  })
  .merge(archiveQuerySchema);
export type QueryDocumentsInput = z.infer<typeof queryDocumentsSchema>;
export class QueryDocumentsDto extends createZodDto(queryDocumentsSchema) {}

export const documentStatsSchema = z
  .object({
    clientId: z.uuid().optional(),
    tripId: z.uuid().optional(),
    operatorId: z.uuid().optional(),
    on: calendarDate.optional(),
  })
  .strict();
export type DocumentStatsInput = z.infer<typeof documentStatsSchema>;
export class DocumentStatsDto extends createZodDto(documentStatsSchema) {}

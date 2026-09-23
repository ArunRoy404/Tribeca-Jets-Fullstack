import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';

/**
 * What the upload routes return.
 *
 * Declared as a schema rather than inferred from Prisma so the response is
 * documented in Swagger like every other DTO, and so the shape the frontend
 * codes against is written down in one place.
 */
export const uploadResponseSchema = z.object({
  id: z.uuid(),

  /**
   * Where to fetch the file, relative to the API host.
   *
   * **This is the value a form stores.** It is relative on purpose: an absolute
   * URL captured at upload time embeds whatever host was running then, so every
   * row written in development would point at localhost for ever, and a change
   * of domain or a move to a CDN would strand every file already uploaded. The
   * frontend already knows its API base, so a relative path costs it nothing.
   */
  url: z.string(),

  filename: z.string(),
  contentType: z.string(),
  size: z.int(),
  kind: z.enum(['IMAGE', 'DOCUMENT']),

  /**
   * True when these exact bytes were already on file for this user and the
   * existing record was returned instead of a second copy being written.
   *
   * Surfaced rather than hidden because it changes what the caller is looking
   * at: the response describes a file that may be older than this request, and
   * a UI that says "uploaded just now" would be wrong about it.
   */
  deduplicated: z.boolean(),

  /**
   * ISO-8601, not `z.date()`.
   *
   * A Zod `date` cannot be expressed in JSON Schema at all, and `createZodDto`
   * publishes its schema to Swagger — so a `z.date()` here throws at document
   * build time and takes the whole of `/api/docs` down with it. What crosses
   * the wire is a string regardless.
   */
  createdAt: z.iso.datetime(),
});

export class UploadResponseDto extends createZodDto(uploadResponseSchema) {}

/**
 * The fields that travel beside the bytes.
 *
 * Every value arrives as a string, because this is multipart — which is why
 * `visibility` is a plain enum and `ownerUserId` is a `z.uuid()` rather than
 * anything needing coercion. Nothing numeric or boolean is accepted here:
 * `size` and `contentType` are read from the file itself, never from the
 * sender.
 */
export const uploadFieldsSchema = z.object({
  /**
   * Who may fetch the bytes afterwards.
   *
   * **Defaults to PRIVATE**, so a caller who says nothing gets the safe
   * answer. Publishing is the deliberate act — an aircraft photograph every
   * broker needs to see is `PUBLIC`; a tax form is not.
   */
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),

  /**
   * The user this document is *about*, who may then read it.
   *
   * This is what files a 1099 into Mark's folder. Naming somebody other than
   * yourself needs permission to manage users, or any broker could drop a
   * document into any other broker's folder.
   */
  ownerUserId: z.uuid().optional(),

  /**
   * A human name, shown instead of the filename — "2025 Form 1099" reads
   * better than "scan_0042.pdf".
   */
  label: z.string().trim().min(1).max(200).optional(),
});

export class UploadFieldsDto extends createZodDto(uploadFieldsSchema) {}

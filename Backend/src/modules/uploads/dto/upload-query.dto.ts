import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const UPLOAD_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'filename',
  'label',
  'size',
] as const;

/**
 * Listing stored files.
 *
 * The filter that matters is `ownerUserId`: it is what turns "a broker's
 * personal folder" into a query rather than a second table. Everything else is
 * the shared pagination and archive vocabulary every list endpoint uses.
 */
export const listUploadsSchema = paginationSchema
  .extend({
    sortBy: sortableBy(UPLOAD_SORTABLE_FIELDS),

    /**
     * Whose folder to open. Passing another user's id requires MANAGE_USERS;
     * a caller may always list their own.
     */
    ownerUserId: z.uuid().optional(),

    /** Narrow to one kind of file — the Documents tab wants documents only. */
    kind: z.enum(['IMAGE', 'DOCUMENT']).optional(),
  })
  .extend(archiveQuerySchema.shape);

export class ListUploadsDto extends createZodDto(listUploadsSchema) {}
export type ListUploadsQuery = z.infer<typeof listUploadsSchema>;

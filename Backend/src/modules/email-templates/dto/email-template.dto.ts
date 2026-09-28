import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import { paginationSchema, sortableBy } from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import { EmailTemplateCategory } from '../../../generated/prisma/enums.js';

const name = z.string().trim().min(1, 'Give the template a name').max(160);
const subject = z.string().trim().min(1, 'A template needs a subject').max(300);
const body = z.string().trim().min(1, 'A template needs a body').max(20000);

/** Merge-field tokens are checked against the catalogue in the service, which names the unknown ones. */
export const createEmailTemplateSchema = z.object({
  name,
  category: z.enum(EmailTemplateCategory).default(EmailTemplateCategory.GENERAL),
  subject,
  body,
  active: z.boolean().default(true),
});
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export class CreateEmailTemplateDto extends createZodDto(createEmailTemplateSchema) {}

/** Written out rather than `.partial()` (AGENTS.md): every field optional, none defaulted. */
export const updateEmailTemplateSchema = z.object({
  name: name.optional(),
  category: z.enum(EmailTemplateCategory).optional(),
  subject: subject.optional(),
  body: body.optional(),
  active: z.boolean().optional(),
});
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export class UpdateEmailTemplateDto extends createZodDto(updateEmailTemplateSchema) {}

export const EMAIL_TEMPLATE_SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'name', 'category'] as const;

export const queryEmailTemplatesSchema = paginationSchema
  .extend({
    sortBy: sortableBy(EMAIL_TEMPLATE_SORTABLE_FIELDS),
    category: z.enum(EmailTemplateCategory).optional(),
    /** `true` — offered when composing; `false` — kept but switched off. */
    active: z.stringbool().optional(),
  })
  .merge(archiveQuerySchema);
export type QueryEmailTemplatesInput = z.infer<typeof queryEmailTemplatesSchema>;
export class QueryEmailTemplatesDto extends createZodDto(queryEmailTemplatesSchema) {}

export const emailTemplateStatsSchema = z.object({
  /**
   * A day in the month "sent this month" counts — the browser's own date, so
   * a desk in New York on the evening of the 31st is not shown next month.
   * Default today in UTC.
   */
  on: calendarDate.optional(),
});
export type EmailTemplateStatsInput = z.infer<typeof emailTemplateStatsSchema>;
export class EmailTemplateStatsDto extends createZodDto(emailTemplateStatsSchema) {}

import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { paginationSchema, sortableBy } from '../../../common/dto/pagination.dto.js';
import { EmailMessageStatus } from '../../../generated/prisma/enums.js';

/**
 * Who an email goes to and what it is about. Exactly one recipient — a
 * client or an operator — and the records its merge fields are filled from.
 * Each is resolved through its own module's scope, and each must belong to
 * the recipient: a client is never emailed about somebody else's invoice.
 */
const contextShape = {
  clientId: z.uuid().optional(),
  operatorId: z.uuid().optional(),
  tripId: z.uuid().optional(),
  quoteId: z.uuid().optional(),
  invoiceId: z.uuid().optional(),
  /** The template it starts from. Optional — an email can be written from scratch. */
  templateId: z.uuid().optional(),
};

const oneRecipient = (value: { clientId?: string; operatorId?: string }) =>
  Boolean(value.clientId) !== Boolean(value.operatorId);
const ONE_RECIPIENT = {
  message: 'Choose one recipient: a client or an operator',
  path: ['clientId'],
};

export const previewEmailSchema = z.object(contextShape).refine(oneRecipient, ONE_RECIPIENT);
export type PreviewEmailInput = z.infer<typeof previewEmailSchema>;
export class PreviewEmailDto extends createZodDto(previewEmailSchema) {}

export const sendEmailSchema = z
  .object({
    ...contextShape,
    /**
     * The final text, as the broker left it. Any merge field still in it is
     * filled again on the way out, and the send is refused while one is
     * missing — nothing goes out with "{amount_due}" in it.
     */
    subject: z.string().trim().min(1, 'The email needs a subject').max(300),
    body: z.string().trim().min(1, 'The email needs a message').max(20000),
  })
  .refine(oneRecipient, ONE_RECIPIENT);
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export class SendEmailDto extends createZodDto(sendEmailSchema) {}

export const EMAIL_SORTABLE_FIELDS = ['createdAt'] as const;

export const queryEmailsSchema = paginationSchema.extend({
  sortBy: sortableBy(EMAIL_SORTABLE_FIELDS),
  status: z.enum(EmailMessageStatus).optional(),
  clientId: z.uuid().optional(),
  operatorId: z.uuid().optional(),
  tripId: z.uuid().optional(),
  templateId: z.uuid().optional(),
});
export type QueryEmailsInput = z.infer<typeof queryEmailsSchema>;
export class QueryEmailsDto extends createZodDto(queryEmailsSchema) {}

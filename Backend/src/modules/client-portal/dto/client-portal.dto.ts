import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';

export const QUOTE_PORTAL_DECISIONS = ['APPROVE', 'REJECT'] as const;
export type QuotePortalDecision = (typeof QUOTE_PORTAL_DECISIONS)[number];

export const respondQuotePortalSchema = z
  .object({
    decision: z.enum(QUOTE_PORTAL_DECISIONS),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export type RespondQuotePortalInput = z.infer<typeof respondQuotePortalSchema>;
export class RespondQuotePortalDto extends createZodDto(respondQuotePortalSchema) {}

import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';

export const askAssistantSchema = z
  .object({
    question: z.string().trim().min(1, 'Ask a question').max(500),
    context: z.string().trim().max(80).optional(),
  })
  .strict();

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;
export class AskAssistantDto extends createZodDto(askAssistantSchema) {}

export const assistantSuggestionsQuerySchema = z
  .object({
    context: z.string().trim().max(80).optional(),
  })
  .strict();

export type AssistantSuggestionsQuery = z.infer<typeof assistantSuggestionsQuerySchema>;
export class AssistantSuggestionsQueryDto extends createZodDto(assistantSuggestionsQuerySchema) {}

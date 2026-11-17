import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';

/**
 * Meta's one-off check when the webhook URL is saved in the Meta app:
 * `GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`, answered with
 * the challenge, as plain text, only when the token is ours.
 */
export const verifyWebhookQuerySchema = z.object({
  'hub.mode': z.string().max(40).optional(),
  'hub.verify_token': z.string().max(200).optional(),
  'hub.challenge': z.string().max(200).optional(),
});

export type VerifyWebhookQuery = z.infer<typeof verifyWebhookQuerySchema>;
export class VerifyWebhookQueryDto extends createZodDto(verifyWebhookQuerySchema) {}

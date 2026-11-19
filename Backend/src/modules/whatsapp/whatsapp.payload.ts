import { z } from 'zod';
import { phoneDigits } from '../../common/phone/phone.js';

/**
 * The part of Meta's webhook payload the assistant reads.
 *
 * Read leniently, on purpose: the route answers Meta, not a form. A 400 for a
 * field Meta adds next year makes Meta retry, then disable the webhook — so
 * anything not understood here is skipped, never refused. Delivery receipts
 * (`statuses`) arrive on the same route and carry no `messages`.
 */
const messageSchema = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string().optional(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
});

const payloadSchema = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z.object({
                messages: z.array(z.unknown()).optional(),
                statuses: z.array(z.unknown()).catch([]),
              }).optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export interface IncomingMessage {
  /** Meta's message id (`wamid…`) — the key a redelivery repeats. */
  id: string;
  /** The sender, digits only, as Meta writes it. */
  from: string;
  /** `text`, `image`, `document`, `audio`… — only `text` is read for now. */
  type: string;
  text: string | null;
  sentAt: Date | null;
}

function payloadItems(body: unknown, key: 'messages' | 'statuses'): unknown[] {
  const payload = payloadSchema.safeParse(body);
  if (!payload.success || payload.data.object !== 'whatsapp_business_account') return [];
  return (payload.data.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.[key] ?? []),
  );
}

export function readIncomingMessages(body: unknown): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  for (const raw of payloadItems(body, 'messages')) {
    const message = messageSchema.safeParse(raw);
    if (!message.success) continue;
    const { id, from, type, text, timestamp } = message.data;
    const seconds = timestamp ? Number(timestamp) : NaN;
    out.push({
      id,
      from: phoneDigits(from),
      type,
      text: type === 'text' ? (text?.body ?? null) : null,
      sentAt: Number.isFinite(seconds) ? new Date(seconds * 1000) : null,
    });
  }
  return out;
}

const failedStatus = z.object({
  id: z.string(),
  status: z.literal('failed'),
  errors: z.array(z.unknown()).catch([]),
});
const receiptError = z.object({ code: z.number() });

export function readFailedStatuses(body: unknown): { id: string; codes: number[] }[] {
  return payloadItems(body, 'statuses').flatMap((raw) => {
    const status = failedStatus.safeParse(raw);
    if (!status.success) return [];
    const codes = status.data.errors.flatMap((error) => {
      const parsed = receiptError.safeParse(error);
      return parsed.success ? [parsed.data.code] : [];
    });
    return [{ id: status.data.id, codes }];
  });
}

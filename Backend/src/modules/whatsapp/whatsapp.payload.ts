import { z } from 'zod';

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
              value: z.object({ messages: z.array(z.unknown()).optional() }).optional(),
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

export function readIncomingMessages(body: unknown): IncomingMessage[] {
  const payload = payloadSchema.safeParse(body);
  if (!payload.success || payload.data.object !== 'whatsapp_business_account') return [];

  const out: IncomingMessage[] = [];
  for (const entry of payload.data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const raw of change.value?.messages ?? []) {
        const message = messageSchema.safeParse(raw);
        if (!message.success) continue;
        const { id, from, type, text, timestamp } = message.data;
        const seconds = timestamp ? Number(timestamp) : NaN;
        out.push({
          id,
          from: from.replace(/\D/g, ''),
          type,
          text: type === 'text' ? (text?.body ?? null) : null,
          sentAt: Number.isFinite(seconds) ? new Date(seconds * 1000) : null,
        });
      }
    }
  }
  return out;
}

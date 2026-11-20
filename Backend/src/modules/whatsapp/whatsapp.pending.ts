import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { createPaymentSchema } from '../../common/dto/payments.js';
import { phoneDigits } from '../../common/phone/phone.js';
import { RedisService } from '../../core/redis/redis.service.js';
import { NoteSubjectType, NoteVisibility } from '../../generated/prisma/enums.js';
import { createClientSchema, updateClientSchema } from '../clients/dto/client.dto.js';
import { createNoteSchema } from '../notes/dto/note.dto.js';
import { sendQuoteSchema } from '../quotes/dto/quote.dto.js';
import { createTaskSchema } from '../tasks/dto/task.dto.js';
import { createTripRequestSchema } from '../trip-requests/dto/trip-request.dto.js';
import { changeTripStatusSchema, rejectTripSchema, updateTripSchema } from '../trips/dto/trip.dto.js';

export const PENDING_TTL_SECONDS = 300;

const { firstName, lastName, email, phone, companyName, notes } = createClientSchema.shape;
export const leadClientPayload = z.object({ firstName, lastName, email, phone, companyName, notes });
export const leadRequestPayload = z.object({
  originAirportId: z.uuid().optional(),
  destinationAirportId: z.uuid().optional(),
  departureDate: z.iso.date().optional(),
  passengers: z.number().optional(),
  internalNotes: createTripRequestSchema.shape.internalNotes,
});
export const paymentPayload = z.object({
  amount: z.number(),
  method: createPaymentSchema.shape.method,
  paidAt: z.iso.date().optional(),
  reference: createPaymentSchema.shape.reference,
});

// JSON stores parsed DTO dates as ISO strings. Accept that representation at
// take(), and feed parsed Dates back through the same DTO fields on CONFIRM.
function dtoDate<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) =>
    value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : value,
  schema);
}

export const taskCreatePayload = createTaskSchema.omit({ notes: true }).strict().extend({
  dueDate: dtoDate(createTaskSchema.shape.dueDate.unwrap()).optional(),
});
export const clientFollowUpPayload = updateClientSchema.pick({
  nextFollowUpAt: true, followUpMethod: true, followUpNote: true,
}).strict().extend({
  nextFollowUpAt: dtoDate(updateClientSchema.shape.nextFollowUpAt.unwrap().unwrap()),
  followUpMethod: updateClientSchema.shape.followUpMethod.unwrap().unwrap().optional(),
  followUpNote: updateClientSchema.shape.followUpNote.unwrap().unwrap().optional(),
});
export const noteCreatePayload = createNoteSchema.strict().extend({
  subjectType: z.literal(NoteSubjectType.CLIENT),
  visibility: z.literal(NoteVisibility.INTERNAL),
});
export const tripStatusPayload = changeTripStatusSchema.strict();
export const tripAssignPayload = z.strictObject({
  assignedBrokerId: updateTripSchema.shape.assignedBrokerId.unwrap().unwrap(),
});
export const clientAssignPayload = z.strictObject({
  assignedBrokerId: updateClientSchema.shape.assignedBrokerId.unwrap().unwrap(),
});
export const quoteSendPayload = sendQuoteSchema.strict().extend({
  validUntil: dtoDate(sendQuoteSchema.shape.validUntil.unwrap()).optional(),
});

const actionBase = z.object({
  userId: z.string().min(1), summary: z.string().min(1), createdAt: z.iso.datetime(),
  // Accept proposals already in Redis at deploy until their existing TTL ends.
  proposalId: z.uuid().optional(),
  ref: z.string().nullable().optional(),
});
const pendingActionSchema = z.discriminatedUnion('kind', [
  actionBase.extend({ kind: z.literal('TRIP_APPROVE'), tripId: z.uuid() }),
  actionBase.extend({ kind: z.literal('TRIP_DECLINE'), tripId: z.uuid(), payload: rejectTripSchema }),
  actionBase.extend({
    kind: z.literal('LEAD_CREATE'),
    lead: z.discriminatedUnion('type', [
      z.object({ type: z.literal('new'), client: leadClientPayload, request: leadRequestPayload.optional() }),
      z.object({ type: z.literal('existing'), clientId: z.uuid(), request: leadRequestPayload }),
    ]),
  }),
  actionBase.extend({ kind: z.literal('TASK_COMPLETE'), taskId: z.uuid() }),
  actionBase.extend({ kind: z.literal('PAYMENT_RECORD'), invoiceId: z.uuid(), payload: paymentPayload }),
  actionBase.extend({ kind: z.literal('TASK_CREATE'), payload: taskCreatePayload }),
  actionBase.extend({ kind: z.literal('CLIENT_FOLLOW_UP'), clientId: z.uuid(), payload: clientFollowUpPayload }),
  actionBase.extend({ kind: z.literal('NOTE_CREATE'), payload: noteCreatePayload }),
  actionBase.extend({ kind: z.literal('TRIP_STATUS'), tripId: z.uuid(), payload: tripStatusPayload }),
  actionBase.extend({ kind: z.literal('TRIP_ASSIGN'), tripId: z.uuid(), payload: tripAssignPayload }),
  actionBase.extend({ kind: z.literal('CLIENT_ASSIGN'), clientId: z.uuid(), payload: clientAssignPayload }),
  actionBase.extend({ kind: z.literal('QUOTE_SEND'), quoteId: z.uuid(), payload: quoteSendPayload }),
]);

export type PendingAction = z.infer<typeof pendingActionSchema>;

export function proposalDetails(action: PendingAction) {
  return action.proposalId ? { proposalId: action.proposalId, kind: action.kind, ref: action.ref ?? null } : undefined;
}

@Injectable()
export class WhatsappPending {
  constructor(private readonly redis: RedisService) {}

  private key(phone: string): string {
    return `whatsapp:pending:${phoneDigits(phone)}`;
  }

  async put(phone: string, action: PendingAction): Promise<void> {
    await this.redis.setString(this.key(phone), JSON.stringify(action), PENDING_TTL_SECONDS);
  }

  async take(phone: string): Promise<PendingAction | null> {
    const stored = await this.redis.takeString(this.key(phone));
    if (stored === null) return null;
    let value: unknown;
    try {
      value = JSON.parse(stored);
    } catch {
      return null;
    }
    const parsed = pendingActionSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

}

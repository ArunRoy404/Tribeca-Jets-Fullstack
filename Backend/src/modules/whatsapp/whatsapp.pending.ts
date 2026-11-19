import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { createPaymentSchema } from '../../common/dto/payments.js';
import { phoneDigits } from '../../config/configuration.js';
import { RedisService } from '../../core/redis/redis.service.js';
import { createClientSchema } from '../clients/dto/client.dto.js';
import { createTripRequestSchema } from '../trip-requests/dto/trip-request.dto.js';
import { rejectTripSchema } from '../trips/dto/trip.dto.js';

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

const actionBase = z.object({ userId: z.string().min(1), summary: z.string().min(1), createdAt: z.iso.datetime() });
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
]);

export type PendingAction = z.infer<typeof pendingActionSchema>;

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

  async drop(phone: string): Promise<string | null> {
    return (await this.take(phone))?.summary ?? null;
  }
}

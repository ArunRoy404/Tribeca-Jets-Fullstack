import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Action, Module, Reach, resolveAccess } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { PaymentMethod, TaskStatus, UserRole } from '../../generated/prisma/enums.js';
import { createClientSchema } from '../clients/dto/client.dto.js';
import { createTripRequestSchema } from '../trip-requests/dto/trip-request.dto.js';
import { WhatsappActions } from './whatsapp.actions.js';
import type { PendingAction } from './whatsapp.pending.js';

const TRIP_ID = '00000000-0000-4000-8000-000000000011';
const CLIENT_ID = '00000000-0000-4000-8000-000000000012';
const AIRPORT_ID = '00000000-0000-4000-8000-000000000013';
const TASK_ID = '00000000-0000-4000-8000-000000000014';
const INVOICE_ID = '00000000-0000-4000-8000-000000000015';
const user: AuthenticatedUser = {
  id: 'owner-id', email: 'owner@example.com', role: UserRole.SUPER_ADMIN, access: resolveAccess(UserRole.SUPER_ADMIN, null),
};
const base = { userId: user.id, summary: 'PRIVATE ACTION SUMMARY', createdAt: '2026-11-19T12:00:00.000Z' };
const client = { id: CLIENT_ID, firstName: 'Private', lastName: 'Clientname', email: 'client@example.com' };
const request = { originAirportId: AIRPORT_ID, departureDate: '2026-11-27', passengers: 4 };
const payment = { amount: 12500, method: PaymentMethod.WIRE_TRANSFER, paidAt: '2026-11-19', reference: 'PRIVATE REFERENCE' };
const approval = { ...base, kind: 'TRIP_APPROVE', tripId: TRIP_ID } satisfies PendingAction;
const newLead = {
  ...base, kind: 'LEAD_CREATE', lead: { type: 'new', client: { firstName: client.firstName, lastName: client.lastName, email: client.email }, request },
} satisfies PendingAction;
const existingLead = {
  ...base, kind: 'LEAD_CREATE', lead: { type: 'existing', clientId: CLIENT_ID, request },
} satisfies PendingAction;

describe('WhatsappActions', () => {
  const trips = { approve: vi.fn(), reject: vi.fn() };
  const clients = { create: vi.fn(), subjectRef: vi.fn() };
  const requests = { create: vi.fn() };
  const tasks = { update: vi.fn() };
  const receivables = { recordPayment: vi.fn() };
  let actions: WhatsappActions;
  const loggerMethods = ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const;
  let logs: Record<(typeof loggerMethods)[number], ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    vi.resetAllMocks();
    logs = Object.fromEntries(loggerMethods.map((method) => [method, vi.spyOn(Logger.prototype, method).mockImplementation(() => {})])) as typeof logs;
    trips.approve.mockResolvedValue({ reference: 1048 });
    trips.reject.mockResolvedValue({ reference: 1048 });
    clients.create.mockResolvedValue(client);
    clients.subjectRef.mockResolvedValue({ id: CLIENT_ID, label: 'Private Clientname', archived: false });
    tasks.update.mockResolvedValue({ title: 'Private task' });
    receivables.recordPayment.mockResolvedValue({ number: 'INV-2026-0042', balance: 0 });
    actions = new WhatsappActions(trips as never, clients as never, requests as never, tasks as never, receivables as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const writes = [trips.approve, trips.reject, clients.create, requests.create, tasks.update, receivables.recordPayment];
  const expectOnlyWrite = (expected: (typeof writes)[number]) => {
    for (const write of writes.filter((write) => write !== expected)) expect(write).not.toHaveBeenCalled();
  };

  it('approves the exact trip as the acting user', async () => {
    expect(await actions.run(user, approval)).toBe('✅ Trip TJ-1048 approved.');
    expect(trips.approve).toHaveBeenCalledExactlyOnceWith(user, TRIP_ID);
    expectOnlyWrite(trips.approve);
    expect(logs.log).toHaveBeenCalledExactlyOnceWith('WhatsApp action TRIP_APPROVE confirmed');
  });

  it('declines the exact trip with the frozen reason', async () => {
    expect(await actions.run(user, { ...base, kind: 'TRIP_DECLINE', tripId: TRIP_ID, payload: { reason: 'Weather' } }))
      .toBe('✅ Trip TJ-1048 declined.');
    expect(trips.reject).toHaveBeenCalledExactlyOnceWith(user, TRIP_ID, { reason: 'Weather' });
    expectOnlyWrite(trips.reject);
  });

  it('creates the lead and files the validated request under the created id', async () => {
    expect(await actions.run(user, newLead)).toBe('✅ Lead Private Clientname created, trip request filed.');
    expect(clients.create).toHaveBeenCalledExactlyOnceWith(user, createClientSchema.parse(newLead.lead.client));
    expect(requests.create).toHaveBeenCalledExactlyOnceWith(user, createTripRequestSchema.parse({ ...request, clientId: CLIENT_ID }));
    expect(clients.create).toHaveBeenCalledBefore(requests.create);
  });

  it('uses the existing live client in scope and files only the request', async () => {
    const actor = { ...user, access: { [Module.LEADS_AGENTS]: { reach: Reach.ALL, actions: [Action.CREATE] } } };
    expect(await actions.run(actor, existingLead)).toBe('✅ Trip request filed for Private Clientname.');
    expect(clients.subjectRef).toHaveBeenCalledExactlyOnceWith(actor, CLIENT_ID);
    expect(requests.create).toHaveBeenCalledExactlyOnceWith(actor, createTripRequestSchema.parse({ ...request, clientId: CLIENT_ID }));
    expectOnlyWrite(requests.create);
  });

  it('checks the matched client again before writing', async () => {
    clients.subjectRef.mockRejectedValue(new NotFoundException('Client not found'));
    expect(await actions.run(user, existingLead)).toBe('❌ Not done: Client not found');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
  });

  it('completes only the exact task', async () => {
    expect(await actions.run(user, { ...base, kind: 'TASK_COMPLETE', taskId: TASK_ID })).toBe('✅ Task "Private task" completed.');
    expect(tasks.update).toHaveBeenCalledExactlyOnceWith(user, TASK_ID, { status: TaskStatus.COMPLETED });
    expectOnlyWrite(tasks.update);
  });

  it('records the stored payment with a Date and reports the service’s returned balance', async () => {
    expect(await actions.run(user, { ...base, kind: 'PAYMENT_RECORD', invoiceId: INVOICE_ID, payload: payment }))
      .toBe('✅ $12,500.00 recorded on INV-2026-0042 — balance $0.00.');
    expect(receivables.recordPayment).toHaveBeenCalledExactlyOnceWith(user, INVOICE_ID, { ...payment, paidAt: new Date('2026-11-19') });
    expectOnlyWrite(receivables.recordPayment);
  });

  it('revalidates stored data before calling a service', async () => {
    expect(await actions.run(user, { ...base, kind: 'PAYMENT_RECORD', invoiceId: INVOICE_ID, payload: { ...payment, amount: 1.001 } }))
      .toBe('❌ Not done — the CRM could not complete it.');
    expect(receivables.recordPayment).not.toHaveBeenCalled();
    expect(logs.error).toHaveBeenCalledExactlyOnceWith('WhatsApp action PAYMENT_RECORD failed (ZodError)');
  });

  it.each([
    [approval, {}],
    [newLead, { [Module.CLIENTS]: { reach: Reach.ALL, actions: [Action.CREATE] } }],
    [newLead, { [Module.TRIP_REQUESTS]: { reach: Reach.ALL, actions: [Action.CREATE] } }],
  ] as const)('refuses withdrawn permission before calling any service', async (action, access) => {
    const actor = { ...user, access: access as AuthenticatedUser['access'] };
    expect(await actions.run(actor, action)).toBe('Not done — your account can no longer do this.');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith(`WhatsApp action ${action.kind} refused (403)`);
  });

  it('refuses confirmation from another id before calling any service', async () => {
    expect(await actions.run({ ...user, id: 'other-id' }, approval)).toBe('Not done — that action belongs to another session.');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith('WhatsApp action TRIP_APPROVE refused (403)');
  });

  it('returns the CRM’s refusal message', async () => {
    trips.approve.mockRejectedValue(new BadRequestException('Trip was already approved.'));
    expect(await actions.run(user, approval)).toBe('❌ Not done: Trip was already approved.');
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith('WhatsApp action TRIP_APPROVE refused (400)');
    expect(logs.log).not.toHaveBeenCalled();
  });

  it('reports partial success when the request fails after creating the lead', async () => {
    requests.create.mockRejectedValue(new BadRequestException('The origin airport has been archived.'));
    expect(await actions.run(user, newLead)).toBe('Created lead Private Clientname, but the trip request was not filed: The origin airport has been archived.');
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith('WhatsApp action LEAD_CREATE refused (400)');
    expect(logs.log).not.toHaveBeenCalled();
  });

  it('logs only action kind, status or class across all logger methods', async () => {
    await actions.run(user, newLead);
    const privateText = 'PRIVATE WHATSAPP MESSAGE';
    receivables.recordPayment.mockRejectedValueOnce(new TypeError(`${privateText}: ${payment.amount}, ${base.summary}`));
    expect(await actions.run(user, { ...base, kind: 'PAYMENT_RECORD', invoiceId: INVOICE_ID, payload: payment }))
      .toBe('❌ Not done — the CRM could not complete it.');
    trips.approve.mockRejectedValueOnce(new BadRequestException(privateText));
    expect(await actions.run(user, approval)).toBe(`❌ Not done: ${privateText}`);
    const recorded = JSON.stringify(loggerMethods.flatMap((method) => logs[method].mock.calls));
    for (const value of [client.lastName, String(payment.amount), base.summary, privateText, payment.reference]) {
      expect(recorded).not.toContain(value);
    }
    expect(logs.error).toHaveBeenCalledExactlyOnceWith('WhatsApp action PAYMENT_RECORD failed (TypeError)');
    expect(logs.log).toHaveBeenCalledTimes(1);
    expect(logs.warn).toHaveBeenCalledTimes(1);
  });
});

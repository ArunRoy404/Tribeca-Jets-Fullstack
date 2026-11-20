import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Action, Module, Reach, resolveAccess } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { FollowUpMethod, NoteSubjectType, NoteVisibility, PaymentMethod, TaskPriority, TaskStatus, TripStatus, UserRole } from '../../generated/prisma/enums.js';
import { createClientSchema } from '../clients/dto/client.dto.js';
import { createTripRequestSchema } from '../trip-requests/dto/trip-request.dto.js';
import { WhatsappActions } from './whatsapp.actions.js';
import type { PendingAction } from './whatsapp.pending.js';

const TRIP_ID = '00000000-0000-4000-8000-000000000011';
const CLIENT_ID = '00000000-0000-4000-8000-000000000012';
const AIRPORT_ID = '00000000-0000-4000-8000-000000000013';
const TASK_ID = '00000000-0000-4000-8000-000000000014';
const INVOICE_ID = '00000000-0000-4000-8000-000000000015';
const BROKER_ID = '00000000-0000-4000-8000-000000000016';
const QUOTE_ID = '00000000-0000-4000-8000-000000000017';
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
const newTask = {
  ...base, kind: 'TASK_CREATE', payload: {
    title: 'New task', description: 'Call the operator', status: TaskStatus.TODO, priority: TaskPriority.HIGH,
    dueDate: new Date('2026-11-20'), assigneeId: BROKER_ID, clientId: CLIENT_ID, tripId: TRIP_ID, checklist: [],
  },
} satisfies PendingAction;
const followUp = {
  ...base, kind: 'CLIENT_FOLLOW_UP', clientId: CLIENT_ID, payload: {
    nextFollowUpAt: new Date('2026-11-20T08:30:00.000Z'), followUpMethod: FollowUpMethod.CALL, followUpNote: 'Call at the office',
  },
} satisfies PendingAction;
const note = {
  ...base, kind: 'NOTE_CREATE', payload: {
    subjectType: NoteSubjectType.CLIENT, subjectId: CLIENT_ID, visibility: NoteVisibility.INTERNAL, body: 'PRIVATE NOTE BODY',
  },
} satisfies PendingAction;
const tripStatus = {
  ...base, kind: 'TRIP_STATUS', tripId: TRIP_ID, payload: { status: TripStatus.CANCELLED, note: 'Weather' },
} satisfies PendingAction;
const tripAssign = {
  ...base, kind: 'TRIP_ASSIGN', tripId: TRIP_ID, payload: { assignedBrokerId: BROKER_ID },
} satisfies PendingAction;
const clientAssign = {
  ...base, kind: 'CLIENT_ASSIGN', clientId: CLIENT_ID, payload: { assignedBrokerId: BROKER_ID },
} satisfies PendingAction;
const quoteSend = {
  ...base, kind: 'QUOTE_SEND', quoteId: QUOTE_ID, payload: { validUntil: new Date('2026-11-27'), note: 'Shared in person' },
} satisfies PendingAction;

describe('WhatsappActions', () => {
  const trips = { approve: vi.fn(), reject: vi.fn(), changeStatus: vi.fn(), update: vi.fn() };
  const clients = { create: vi.fn(), subjectRef: vi.fn(), update: vi.fn() };
  const requests = { create: vi.fn() };
  const tasks = { update: vi.fn(), create: vi.fn() };
  const receivables = { recordPayment: vi.fn() };
  const notes = { create: vi.fn() };
  const quotes = { send: vi.fn() };
  let actions: WhatsappActions;
  const loggerMethods = ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const;
  let logs: Record<(typeof loggerMethods)[number], ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    vi.resetAllMocks();
    logs = Object.fromEntries(loggerMethods.map((method) => [method, vi.spyOn(Logger.prototype, method).mockImplementation(() => {})])) as typeof logs;
    trips.approve.mockResolvedValue({ reference: 1048 });
    trips.reject.mockResolvedValue({ reference: 1048 });
    trips.changeStatus.mockResolvedValue({ reference: 1048, status: TripStatus.CANCELLED });
    trips.update.mockResolvedValue({ reference: 1048 });
    clients.create.mockResolvedValue(client);
    clients.subjectRef.mockResolvedValue({ id: CLIENT_ID, label: 'Private Clientname', archived: false });
    tasks.update.mockResolvedValue({ title: 'Private task' });
    tasks.create.mockResolvedValue({ id: TASK_ID, reference: 25, title: newTask.payload.title });
    requests.create.mockResolvedValue({ reference: 42 });
    notes.create.mockResolvedValue({ id: CLIENT_ID });
    receivables.recordPayment.mockResolvedValue({ number: 'INV-2026-0042', balance: 0 });
    quotes.send.mockResolvedValue({ reference: 1042 });
    actions = new WhatsappActions(trips as never, clients as never, requests as never, tasks as never,
      receivables as never, notes as never, quotes as never);
  });
  afterEach(() => vi.restoreAllMocks());

  const writes = [
    trips.approve, trips.reject, clients.create, requests.create, tasks.update, receivables.recordPayment,
    trips.changeStatus, trips.update, clients.update, tasks.create, notes.create, quotes.send,
  ];
  const expectOnlyWrite = (expected: (typeof writes)[number]) => {
    for (const write of writes.filter((write) => write !== expected)) expect(write).not.toHaveBeenCalled();
  };

  it('approves the exact trip as the acting user', async () => {
    expect((await actions.run(user, approval)).text).toBe('✅ Trip TJ-1048 approved.');
    expect(trips.approve).toHaveBeenCalledExactlyOnceWith(user, TRIP_ID);
    expectOnlyWrite(trips.approve);
    expect(logs.log).toHaveBeenCalledExactlyOnceWith('WhatsApp action TRIP_APPROVE confirmed');
  });

  it('records the task reference after creation and leaves it null on refusal', async () => {
    await expect(actions.run(user, newTask)).resolves.toMatchObject({ outcome: 'done', ref: 'TSK-25' });
    tasks.create.mockRejectedValueOnce(new BadRequestException('Invalid task'));
    await expect(actions.run(user, newTask)).resolves.toMatchObject({ outcome: 'refused', ref: null });
    await expect(actions.run(user, newLead)).resolves.toMatchObject({ outcome: 'done', ref: CLIENT_ID });
  });

  it('declines the exact trip with the frozen reason', async () => {
    expect((await actions.run(user, { ...base, kind: 'TRIP_DECLINE', tripId: TRIP_ID, payload: { reason: 'Weather' } })).text)
      .toBe('✅ Trip TJ-1048 declined.');
    expect(trips.reject).toHaveBeenCalledExactlyOnceWith(user, TRIP_ID, { reason: 'Weather' });
    expectOnlyWrite(trips.reject);
  });

  it('creates the lead and files the validated request under the created id', async () => {
    expect((await actions.run(user, newLead)).text).toBe('✅ Lead Private Clientname created, trip request filed.');
    expect(clients.create).toHaveBeenCalledExactlyOnceWith(user, createClientSchema.parse(newLead.lead.client));
    expect(requests.create).toHaveBeenCalledExactlyOnceWith(user, createTripRequestSchema.parse({ ...request, clientId: CLIENT_ID }));
    expect(clients.create).toHaveBeenCalledBefore(requests.create);
  });

  it('uses the existing live client in scope and files only the request', async () => {
    const actor = { ...user, access: { [Module.LEADS_AGENTS]: { reach: Reach.ALL, actions: [Action.CREATE] } } };
    expect((await actions.run(actor, existingLead)).text).toBe('✅ Trip request filed for Private Clientname.');
    expect(clients.subjectRef).toHaveBeenCalledExactlyOnceWith(actor, CLIENT_ID);
    expect(requests.create).toHaveBeenCalledExactlyOnceWith(actor, createTripRequestSchema.parse({ ...request, clientId: CLIENT_ID }));
    expectOnlyWrite(requests.create);
  });

  it('checks the matched client again before writing', async () => {
    clients.subjectRef.mockRejectedValue(new NotFoundException('Client not found'));
    expect((await actions.run(user, existingLead)).text).toBe('❌ Not done: Client not found');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
  });

  it('completes only the exact task', async () => {
    expect((await actions.run(user, { ...base, kind: 'TASK_COMPLETE', taskId: TASK_ID })).text).toBe('✅ Task "Private task" completed.');
    expect(tasks.update).toHaveBeenCalledExactlyOnceWith(user, TASK_ID, { status: TaskStatus.COMPLETED });
    expectOnlyWrite(tasks.update);
  });

  it('records the stored payment with a Date and reports the service’s returned balance', async () => {
    expect((await actions.run(user, { ...base, kind: 'PAYMENT_RECORD', invoiceId: INVOICE_ID, payload: payment })).text)
      .toBe('✅ $12,500.00 recorded on INV-2026-0042 — balance $0.00.');
    expect(receivables.recordPayment).toHaveBeenCalledExactlyOnceWith(user, INVOICE_ID, { ...payment, paidAt: new Date('2026-11-19') });
    expectOnlyWrite(receivables.recordPayment);
  });

  it.each([
    { action: newTask, write: tasks.create, ids: [], reply: '✅ Task "New task" created.' },
    { action: followUp, write: clients.update, ids: [CLIENT_ID], reply: '✅ Client follow-up scheduled.' },
    { action: note, write: notes.create, ids: [], reply: '✅ Internal client note added.' },
    { action: tripStatus, write: trips.changeStatus, ids: [TRIP_ID], reply: '✅ Trip TJ-1048 moved to CANCELLED.' },
    { action: tripAssign, write: trips.update, ids: [TRIP_ID], reply: '✅ Trip TJ-1048 reassigned.' },
    { action: clientAssign, write: clients.update, ids: [CLIENT_ID], reply: '✅ Client reassigned.' },
    { action: quoteSend, write: quotes.send, ids: [QUOTE_ID], reply: '✅ Quote Q-1042 marked as sent. No email was sent.' },
  ])('confirms $action.kind with only the frozen DTO payload and ids', async ({ action, write, ids, reply }) => {
    expect((await actions.run(user, action)).text).toBe(reply);
    expect(write).toHaveBeenCalledExactlyOnceWith(user, ...ids, action.payload);
    expectOnlyWrite(write);
    expect(clients.subjectRef).not.toHaveBeenCalled();
    expect(logs.log).toHaveBeenCalledExactlyOnceWith(`WhatsApp action ${action.kind} confirmed`);
    expect(JSON.stringify(logs.log.mock.calls)).not.toContain(note.payload.body);
  });

  it.each([
    { ...newTask, payload: { ...newTask.payload, title: ' ' } },
    { ...followUp, payload: { ...followUp.payload, nextFollowUpAt: 'tomorrow' } },
    { ...note, payload: { ...note.payload, body: ' ' } },
    { ...note, payload: { ...note.payload, visibility: NoteVisibility.SHARED } },
    { ...tripStatus, payload: { ...tripStatus.payload, status: 'UNKNOWN' } },
    { ...tripAssign, payload: { assignedBrokerId: 'some-name' } },
    { ...clientAssign, payload: { ...clientAssign.payload, status: 'LEAD' } },
    { ...quoteSend, payload: { ...quoteSend.payload, validUntil: 'Friday' } },
  ])('refuses a tampered $kind payload without writing', async (action) => {
    expect((await actions.run(user, action as PendingAction)).text).toBe('❌ Not done — the CRM could not complete it.');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(logs.error).toHaveBeenCalledExactlyOnceWith(`WhatsApp action ${action.kind} failed (ZodError)`);
  });

  it.each([
    [newTask, { [Module.TASKS]: { reach: Reach.ALL, actions: [Action.CREATE] } }],
    [newTask, { [Module.TASKS]: { reach: Reach.ALL, actions: [Action.ASSIGN] } }],
    [followUp, {}], [note, {}], [tripStatus, {}], [quoteSend, {}],
    [tripAssign, { [Module.TRIPS]: { reach: Reach.ALL, actions: [Action.EDIT] } }],
    [clientAssign, { [Module.CLIENTS]: { reach: Reach.ALL, actions: [Action.EDIT] } }],
  ] satisfies [PendingAction, AuthenticatedUser['access']][])('rechecks withdrawn permission on confirmation', async (action, access) => {
    expect((await actions.run({ ...user, access }, action)).text).toBe('Not done — your account can no longer do this.');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
  });

  it('uses current Clients EDIT and Leads & Agents ASSIGN to confirm a client reassignment', async () => {
    const actor = { ...user, access: {
      [Module.CLIENTS]: { reach: Reach.ALL, actions: [Action.EDIT] },
      [Module.LEADS_AGENTS]: { reach: Reach.ALL, actions: [Action.ASSIGN] },
    } };
    expect((await actions.run(actor, clientAssign)).text).toBe('✅ Client reassigned.');
    expect(clients.update).toHaveBeenCalledExactlyOnceWith(actor, CLIENT_ID, clientAssign.payload);
    expectOnlyWrite(clients.update);
  });

  it.each([undefined, BROKER_ID])('confirms an unassigned or self-assigned task with CREATE alone (%s)', async (assigneeId) => {
    const actor = { ...user, id: BROKER_ID, access: { [Module.TASKS]: { reach: Reach.ALL, actions: [Action.CREATE] } } };
    const payload = { ...newTask.payload, assigneeId };
    expect((await actions.run(actor, { ...newTask, userId: actor.id, payload })).text).toBe('✅ Task "New task" created.');
    expect(tasks.create).toHaveBeenCalledExactlyOnceWith(actor, payload);
    expectOnlyWrite(tasks.create);
  });

  it('refuses to confirm a new action for a different caller', async () => {
    expect((await actions.run({ ...user, id: 'other-id' }, note)).text).toBe('Not done — that action belongs to another session.');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
  });

  it('passes through the trip lifecycle refusal on confirmation', async () => {
    const message = 'A COMPLETED trip cannot move to CANCELLED. From here it can move to: .';
    trips.changeStatus.mockRejectedValueOnce(new BadRequestException(message));
    expect((await actions.run(user, tripStatus)).text).toBe(`❌ Not done: ${message}`);
    expect(trips.changeStatus).toHaveBeenCalledExactlyOnceWith(user, TRIP_ID, tripStatus.payload);
    expectOnlyWrite(trips.changeStatus);
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith('WhatsApp action TRIP_STATUS refused (400)');
  });

  it('revalidates stored data before calling a service', async () => {
    expect((await actions.run(user, { ...base, kind: 'PAYMENT_RECORD', invoiceId: INVOICE_ID, payload: { ...payment, amount: 1.001 } })).text)
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
    expect((await actions.run(actor, action)).text).toBe('Not done — your account can no longer do this.');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith(`WhatsApp action ${action.kind} refused (403)`);
  });

  it('refuses confirmation from another id before calling any service', async () => {
    expect((await actions.run({ ...user, id: 'other-id' }, approval)).text).toBe('Not done — that action belongs to another session.');
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith('WhatsApp action TRIP_APPROVE refused (403)');
  });

  it('returns the CRM’s refusal message', async () => {
    trips.approve.mockRejectedValue(new BadRequestException('Trip was already approved.'));
    expect((await actions.run(user, approval)).text).toBe('❌ Not done: Trip was already approved.');
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith('WhatsApp action TRIP_APPROVE refused (400)');
    expect(logs.log).not.toHaveBeenCalled();
  });

  it('reports partial success when the request fails after creating the lead', async () => {
    requests.create.mockRejectedValue(new BadRequestException('The origin airport has been archived.'));
    expect((await actions.run(user, newLead)).text).toBe('Created lead Private Clientname, but the trip request was not filed: The origin airport has been archived.');
    expect(logs.warn).toHaveBeenCalledExactlyOnceWith('WhatsApp action LEAD_CREATE refused (400)');
    expect(logs.log).not.toHaveBeenCalled();
  });

  it('logs only action kind, status or class across all logger methods', async () => {
    await actions.run(user, newLead);
    const privateText = 'PRIVATE WHATSAPP MESSAGE';
    receivables.recordPayment.mockRejectedValueOnce(new TypeError(`${privateText}: ${payment.amount}, ${base.summary}`));
    expect((await actions.run(user, { ...base, kind: 'PAYMENT_RECORD', invoiceId: INVOICE_ID, payload: payment })).text)
      .toBe('❌ Not done — the CRM could not complete it.');
    trips.approve.mockRejectedValueOnce(new BadRequestException(privateText));
    expect((await actions.run(user, approval)).text).toBe(`❌ Not done: ${privateText}`);
    const recorded = JSON.stringify(loggerMethods.flatMap((method) => logs[method].mock.calls));
    for (const value of [client.lastName, String(payment.amount), base.summary, privateText, payment.reference]) {
      expect(recorded).not.toContain(value);
    }
    expect(logs.error).toHaveBeenCalledExactlyOnceWith('WhatsApp action PAYMENT_RECORD failed (TypeError)');
    expect(logs.log).toHaveBeenCalledTimes(1);
    expect(logs.warn).toHaveBeenCalledTimes(1);
  });
});

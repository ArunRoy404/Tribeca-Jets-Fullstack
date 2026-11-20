import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { FollowUpMethod, NoteSubjectType, NoteVisibility, PaymentMethod, TaskPriority, TaskStatus, TripStatus, UserRole } from '../../generated/prisma/enums.js';
import { NOTHING_PENDING_REPLY, WhatsappAgent } from './whatsapp.agent.js';
import type { AiClient } from './whatsapp.ai-client.js';
import { WhatsappMemory } from './whatsapp.memory.js';
import { WhatsappPending, type PendingAction } from './whatsapp.pending.js';
import type { ToolContext } from './whatsapp.tools.js';

const PHONE = '15551234567';
const KEY = `whatsapp:pending:${PHONE}`;
const user: AuthenticatedUser = {
  id: 'owner-id', email: 'owner@example.com', role: UserRole.SUPER_ADMIN,
  access: resolveAccess(UserRole.SUPER_ADMIN, null), timeZone: 'Asia/Dhaka',
};
const approval: PendingAction = {
  kind: 'TRIP_APPROVE', tripId: '00000000-0000-4000-8000-000000000001',
  summary: 'Approve trip TJ-1048 — Alex Vance, KTEB → KMIA, Fri 27 Nov.',
  userId: user.id, createdAt: '2026-11-19T10:00:00.000Z',
};
const completion: PendingAction = {
  kind: 'TASK_COMPLETE', taskId: '00000000-0000-4000-8000-000000000002',
  summary: 'Complete task "Call the broker".', userId: user.id, createdAt: approval.createdAt,
};
const CLIENT_ID = '00000000-0000-4000-8000-000000000003';
const BROKER_ID = '00000000-0000-4000-8000-000000000004';
const QUOTE_ID = '00000000-0000-4000-8000-000000000005';
const base = { userId: user.id, summary: 'Frozen proposal', createdAt: approval.createdAt };
const newNote = {
  ...base, kind: 'NOTE_CREATE', payload: {
    subjectType: NoteSubjectType.CLIENT, subjectId: CLIENT_ID, visibility: NoteVisibility.INTERNAL, body: 'Call after the flight.',
  },
} satisfies PendingAction;
const newActions = [
  { ...base, kind: 'TASK_CREATE', payload: {
    title: 'Call the broker', priority: TaskPriority.HIGH, status: TaskStatus.TODO, checklist: [],
    dueDate: new Date('2026-11-20'), assigneeId: BROKER_ID, clientId: CLIENT_ID, tripId: approval.tripId,
  } },
  { ...base, kind: 'CLIENT_FOLLOW_UP', clientId: CLIENT_ID, payload: {
    nextFollowUpAt: new Date('2026-11-20T08:30:00.000Z'), followUpMethod: FollowUpMethod.CALL, followUpNote: 'Ask about the dates',
  } },
  newNote,
  { ...base, kind: 'TRIP_STATUS', tripId: approval.tripId, payload: { status: TripStatus.CANCELLED, note: 'Weather' } },
  { ...base, kind: 'TRIP_ASSIGN', tripId: approval.tripId, payload: { assignedBrokerId: BROKER_ID } },
  { ...base, kind: 'CLIENT_ASSIGN', clientId: CLIENT_ID, payload: { assignedBrokerId: BROKER_ID } },
  { ...base, kind: 'QUOTE_SEND', quoteId: QUOTE_ID, payload: { validUntil: new Date('2026-11-27'), note: 'Hand-delivered' } },
] satisfies PendingAction[];
const askToConfirm = (summary: string) =>
  `⚠️ ${summary}\n\nReply *CONFIRM* to proceed or *CANCEL* to abort (expires in 5 minutes).`;
const textReply = (text: string) => ({ text, documents: [] });
const itinerary = { body: Buffer.from('%PDF private'), filename: 'Itinerary-TJ-1048.pdf', contentType: 'application/pdf' };

/** The map expires entries, and a take removes its entry before it can yield. */
function fixture() {
  const entries = new Map<string, { value: string; expires: number }>();
  const read = (key: string) => {
    const entry = entries.get(key);
    if (!entry || entry.expires <= Date.now()) {
      entries.delete(key);
      return null;
    }
    return entry.value;
  };
  const redis = {
    setString: vi.fn(async (key: string, value: string, ttl: number) => {
      entries.set(key, { value, expires: Date.now() + ttl * 1000 });
    }),
    getString: vi.fn(async (key: string) => read(key)),
    takeString: vi.fn(async (key: string) => {
      const value = read(key);
      entries.delete(key);
      return value;
    }),
    del: vi.fn(async (key: string) => { entries.delete(key); }),
  };
  return { redis, pending: new WhatsappPending(redis as never), memory: new WhatsappMemory(redis as never) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(approval.createdAt));
});
afterEach(() => vi.useRealTimers());

describe('WhatsappPending', () => {
  it('stores JSON for 300 seconds and takes the action atomically once', async () => {
    const { redis, pending } = fixture();
    await expect(pending.put('+1 555 123 4567', approval)).resolves.toBeUndefined();
    expect(redis.setString).toHaveBeenCalledExactlyOnceWith(KEY, JSON.stringify(approval), 300);
    expect(await Promise.all([pending.take(PHONE), pending.take(PHONE)])).toEqual([approval, null]);
    expect(redis.takeString).toHaveBeenCalledTimes(2);
    expect(redis.getString).not.toHaveBeenCalled();
  });

  it.each([
    { ...approval, kind: 'TRIP_DECLINE', payload: { reason: 'Weather' } },
    { ...approval, kind: 'LEAD_CREATE', lead: { type: 'new', client: { firstName: 'Alex', lastName: 'Vance' },
      request: { departureDate: '2026-11-27' } } },
    { ...approval, kind: 'PAYMENT_RECORD', invoiceId: '00000000-0000-4000-8000-000000000003',
      payload: { amount: 12500, paidAt: '2026-11-27', method: PaymentMethod.WIRE_TRANSFER } },
  ] satisfies PendingAction[])('preserves the frozen payload for $kind through JSON', async (action) => {
    const { pending } = fixture();
    await pending.put(PHONE, action);
    const { userId, summary, createdAt } = action;
    const restored = await pending.take(PHONE);
    expect(restored).toMatchObject({ userId, summary, createdAt, kind: action.kind });
    if (action.kind === 'LEAD_CREATE') {
      expect(restored).toHaveProperty('lead', action.lead);
    } else {
      expect(restored).toHaveProperty('payload', action.payload);
    }
  });

  it.each(['{bad JSON', 'null', '{"kind":"TRIP_APPROVE"}'])('consumes a malformed value %s and returns null', async (stored) => {
    const { pending, redis } = fixture();
    await redis.setString(KEY, stored, 300);
    expect(await pending.take(PHONE)).toBeNull();
    expect(await redis.getString(KEY)).toBeNull();
  });

  it.each(newActions)('round-trips the frozen $kind action with parsed dates', async (action) => {
    const { pending, redis } = fixture();
    await pending.put(PHONE, action);
    expect(redis.setString).toHaveBeenCalledExactlyOnceWith(KEY, JSON.stringify(action), 300);
    expect(await pending.take(PHONE)).toStrictEqual(action);
    expect(await pending.take(PHONE)).toBeNull();
  });

  it('expires at five minutes and keeps phones separate', async () => {
    const { pending } = fixture();
    await pending.put(PHONE, approval);
    await vi.advanceTimersByTimeAsync(299_999);
    await pending.put('15550000000', completion);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending.take(PHONE)).toBeNull();
    expect(await pending.take('15550000000')).toEqual(completion);
  });
});

describe('WhatsappAgent confirmations', () => {
  const success = '✅ Trip TJ-1048 approved.';
  const question = 'Approve trip TJ-1048';
  const settings = { read: vi.fn() };
  let store: ReturnType<typeof fixture>;
  let respond: ReturnType<typeof vi.fn<AiClient['respond']>>;
  let dispatch: ReturnType<typeof vi.fn>;
  let specs: ReturnType<typeof vi.fn>;
  let run: ReturnType<typeof vi.fn>;
  let agent: WhatsappAgent;

  beforeEach(() => {
    store = fixture();
    respond = vi.fn();
    specs = vi.fn(() => []);
    dispatch = vi.fn();
    run = vi.fn().mockResolvedValue({ text: success, outcome: 'done', ref: 'TJ-1048' });
    agent = new WhatsappAgent(async () => ({ respond }), store.memory, { specs, dispatch } as never,
      settings as never, store.pending, { run } as never);
  });

  it('CONFIRM from a second phone cannot take the first phone’s proposal', async () => {
    const recordAction = vi.fn();
    const proposal = { ...approval, proposalId: '00000000-0000-4000-8000-000000000002', ref: 'TJ-1048' };
    await store.pending.put(PHONE, proposal);
    await expect(agent.reply(user, '15550000000', 'CONFIRM', true, recordAction))
      .resolves.toMatchObject({ text: NOTHING_PENDING_REPLY });
    expect(run).not.toHaveBeenCalled();
    expect(recordAction).not.toHaveBeenCalled();
    await expect(agent.reply(user, PHONE, 'CONFIRM', true, recordAction)).resolves.toMatchObject({ text: success });
    expect(recordAction).toHaveBeenCalledExactlyOnceWith({
      action: 'whatsapp.action_confirmed',
      details: { proposalId: proposal.proposalId, kind: 'TRIP_APPROVE', ref: 'TJ-1048', outcome: 'done' },
    });
  });

  function modelProposes(action: PendingAction) {
    respond.mockResolvedValueOnce({ kind: 'tools', calls: [
      { id: 'proposal', name: 'approve_trip', argumentsJson: '{"reference":"1048"}' },
      { id: 'unused', name: 'find_client', argumentsJson: '{"query":"private"}' },
    ] }).mockResolvedValueOnce({ kind: 'text', text: 'Model claims it was done.' });
    dispatch.mockImplementationOnce(async () => {
      await store.pending.put(PHONE, action);
      return { proposed: true, summary: action.summary };
    });
  }

  it('returns the fixed proposal immediately and remembers only the exchange', async () => {
    modelProposes(approval);
    expect(await agent.reply(user, PHONE, question, true)).toEqual(textReply(askToConfirm(approval.summary)));
    expect(respond).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(user, 'approve_trip', '{"reference":"1048"}', expect.objectContaining({ phone: PHONE }));
    expect(run).not.toHaveBeenCalled();
    expect(await store.memory.load(PHONE)).toEqual([
      { kind: 'text', role: 'user', text: question },
      { kind: 'text', role: 'assistant', text: askToConfirm(approval.summary) },
    ]);
  });

  it('does not return a document prepared earlier in the same reply as a proposal', async () => {
    respond.mockResolvedValueOnce({ kind: 'tools', calls: [
      { id: 'document', name: 'send_itinerary', argumentsJson: '{"trip":"TJ-1048"}' },
      { id: 'proposal', name: 'approve_trip', argumentsJson: '{"reference":"1048"}' },
    ] });
    dispatch.mockImplementationOnce(async (_user, _name, _args, context: ToolContext) => {
      context.documents.push(itinerary);
      return { attached: itinerary.filename };
    }).mockImplementationOnce(async () => {
      await store.pending.put(PHONE, approval);
      return { proposed: true, summary: approval.summary };
    });
    expect(await agent.reply(user, PHONE, 'Send the itinerary and approve it', true)).toEqual(textReply(askToConfirm(approval.summary)));
    expect(await store.pending.take(PHONE)).toEqual(approval);
  });

  it.each(['CONFIRM', 'confirm.', ' Confirm! '])('runs %j without asking the model', async (text) => {
    await store.pending.put(PHONE, approval);
    expect(await agent.reply(user, PHONE, text, true)).toEqual(textReply(success));
    expect(run).toHaveBeenCalledExactlyOnceWith(user, approval);
    expect(respond).not.toHaveBeenCalled();
    expect(await store.memory.load(PHONE)).toEqual([
      { kind: 'text', role: 'user', text }, { kind: 'text', role: 'assistant', text: success },
    ]);
  });

  it.each([
    { ...newNote.payload, body: '' },
    { ...newNote.payload, visibility: NoteVisibility.SHARED },
  ])('consumes an invalid note payload without executing it on CONFIRM', async (payload) => {
    await store.redis.setString(KEY, JSON.stringify({ ...newNote, payload }), 300);
    expect(await agent.reply(user, PHONE, 'CONFIRM', true)).toEqual(textReply(NOTHING_PENDING_REPLY));
    expect(await store.redis.getString(KEY)).toBeNull();
    expect(run).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
  });

  it('runs two simultaneous confirmations once', async () => {
    await store.pending.put(PHONE, approval);
    expect(await Promise.all([
      agent.reply(user, PHONE, 'CONFIRM', true),
      agent.reply(user, PHONE, 'CONFIRM', true),
    ])).toEqual([textReply(success), textReply(NOTHING_PENDING_REPLY)]);
    expect(run).toHaveBeenCalledTimes(1);
    expect(respond).not.toHaveBeenCalled();
  });

  it('returns the empty reply after expiry', async () => {
    await store.pending.put(PHONE, approval);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(await agent.reply(user, PHONE, 'CONFIRM', true)).toEqual(textReply(NOTHING_PENDING_REPLY));
    expect(run).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
  });

  it('cancels with or without punctuation without running anything', async () => {
    await store.pending.put(PHONE, approval);
    expect(await agent.reply(user, PHONE, ' cancel. ', true)).toEqual(textReply('Cancelled — nothing was changed.'));
    expect(await agent.reply(user, PHONE, 'CANCEL', true)).toEqual(textReply(NOTHING_PENDING_REPLY));
    expect(run).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
  });

  it('drops the pending action before the next ordinary question reaches the model', async () => {
    await store.pending.put(PHONE, approval);
    respond.mockImplementation(async () => {
      expect(await store.redis.getString(KEY)).toBeNull();
      return { kind: 'text', text: 'What else would you like to know?' };
    });
    expect(await agent.reply(user, PHONE, 'Okay', true)).toEqual(textReply(
      `(Not done: ${approval.summary} — cancelled.)\n\nWhat else would you like to know?`,
    ));
    expect(run).not.toHaveBeenCalled();
  });

  it('cancels the pending action before fulfilling a document request', async () => {
    await store.pending.put(PHONE, approval);
    respond.mockImplementationOnce(async () => {
      expect(await store.redis.getString(KEY)).toBeNull();
      return { kind: 'tools', calls: [{ id: 'document', name: 'send_itinerary', argumentsJson: '{"trip":"TJ-1048"}' }] };
    }).mockResolvedValueOnce({ kind: 'text', text: 'Attached the itinerary.' });
    dispatch.mockImplementationOnce(async (_user, _name, _args, context: ToolContext) => {
      context.documents.push(itinerary);
      return { attached: itinerary.filename };
    });

    expect(await agent.reply(user, PHONE, 'Send the itinerary', true)).toEqual({
      text: `(Not done: ${approval.summary} — cancelled.)\n\nAttached the itinerary.`, documents: [itinerary],
    });
    expect(await store.pending.take(PHONE)).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it('shows the cancellation then the new fixed proposal, leaving only the new one', async () => {
    await store.pending.put(PHONE, approval);
    modelProposes(completion);
    expect(await agent.reply(user, PHONE, 'Complete the task', true)).toEqual(textReply(
      `(Not done: ${approval.summary} — cancelled.)\n\n${askToConfirm(completion.summary)}`,
    ));
    expect(await store.pending.take(PHONE)).toEqual(completion);
    expect(await store.pending.take(PHONE)).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it('keeps direct development questions separate from the phone’s pending action', async () => {
    await store.pending.put(PHONE, approval);
    respond.mockResolvedValue({ kind: 'text', text: 'Read-only reply.' });
    expect(await agent.reply(user, PHONE, 'CONFIRM')).toEqual(textReply('Read-only reply.'));
    expect(specs).toHaveBeenCalledWith(false);
    expect(run).not.toHaveBeenCalled();
    expect(await store.pending.take(PHONE)).toEqual(approval);
  });
});

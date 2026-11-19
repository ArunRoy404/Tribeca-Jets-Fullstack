import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { resolveAccess } from '../../common/authorization/access.js';
import { DEFAULT_TIME_ZONE } from '../../common/dates/time-zone.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { WhatsappAgent, AI_UNAVAILABLE_REPLY, NARROW_QUESTION_REPLY } from './whatsapp.agent.js';
import { OpenAiClient, whatsappAiClientProvider, type AiClient, type AiTurn } from './whatsapp.ai-client.js';
import { WhatsappMemory } from './whatsapp.memory.js';
import { WhatsappSender } from './whatsapp.sender.js';
import { FAILED_REPLY, NON_TEXT_REPLY, NOT_READY_REPLY, WhatsappService } from './whatsapp.service.js';
import type { IncomingMessage } from './whatsapp.payload.js';
import type { ToolContext } from './whatsapp.tools.js';

// Even adapter tests have no network-capable SDK instance.
const sdk = vi.hoisted(() => ({ construct: vi.fn(), create: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    responses = { create: sdk.create };
    constructor(options: unknown) { sdk.construct(options); }
  },
}));

const PHONE = '15551234567';
const user: AuthenticatedUser = {
  id: 'owner-id', email: 'owner@example.com', role: UserRole.SUPER_ADMIN,
  access: resolveAccess(UserRole.SUPER_ADMIN, null),
};
const final = (text: string): AiTurn => ({ kind: 'text', text });
const textReply = (text: string) => ({ text, documents: [] });
const itinerary = { body: Buffer.from('%PDF PRIVATE MANIFEST'), filename: 'Itinerary-TJ-1048.pdf', contentType: 'application/pdf' };
const quote = { body: Buffer.from('%PDF PRIVATE QUOTE'), filename: 'Quote-Q-1042.pdf', contentType: 'application/pdf' };
const calls = (count = 1): AiTurn => ({
  kind: 'tools',
  calls: Array.from({ length: count }, (_, index) => ({
    id: `call-${index}`, name: 'find_client', argumentsJson: '{"query":"Alex"}',
  })),
});

/** A string store, with each write's TTL observable without a Redis server. */
function memoryFixture() {
  const strings = new Map<string, string>();
  const redis = {
    getString: vi.fn(async (key: string) => strings.get(key) ?? null),
    setString: vi.fn(async (key: string, value: string, _ttl: number) => { strings.set(key, value); }),
    del: vi.fn(async (key: string) => { strings.delete(key); }),
  };
  return { strings, redis, memory: new WhatsappMemory(redis as never) };
}

describe('WhatsappAgent loop and memory', () => {
  let fixture: ReturnType<typeof memoryFixture>;
  let respond: ReturnType<typeof vi.fn<AiClient['respond']>>;
  let dispatch: ReturnType<typeof vi.fn>;
  const settings = { read: vi.fn(async () => ({ companyTimeZone: DEFAULT_TIME_ZONE })) };
  let agent: WhatsappAgent;

  beforeEach(() => {
    fixture = memoryFixture();
    respond = vi.fn<AiClient['respond']>();
    dispatch = vi.fn().mockResolvedValue({ clients: [{ displayName: 'Alex' }] });
    settings.read.mockClear();
    agent = new WhatsappAgent(async () => ({ respond }), fixture.memory, { specs: () => [], dispatch } as never, settings as never, {} as never, {} as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns a plain reply and saves only user text and the final reply', async () => {
    respond.mockResolvedValue(final('Not on file.'));
    expect(await agent.reply(user, PHONE, 'A question')).toEqual(textReply('Not on file.'));
    expect(await fixture.memory.load(PHONE)).toEqual([
      { kind: 'text', role: 'user', text: 'A question' },
      { kind: 'text', role: 'assistant', text: 'Not on file.' },
    ]);
  });

  it('dispatches a tool with the acting user and feeds its result to the next call', async () => {
    respond.mockResolvedValueOnce(calls()).mockResolvedValueOnce(final('Alex is on file.'));
    expect(await agent.reply(user, PHONE, 'Find Alex')).toEqual(textReply('Alex is on file.'));
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(user, 'find_client', '{"query":"Alex"}', {
      timeZone: DEFAULT_TIME_ZONE, companyTimeZone: expect.any(Function), documents: [],
    });
    expect(respond.mock.calls[1]?.[0].messages).toEqual([
      { kind: 'text', role: 'user', text: 'Find Alex' },
      { kind: 'tool_call', id: 'call-0', name: 'find_client', argumentsJson: '{"query":"Alex"}' },
      { kind: 'tool_result', id: 'call-0', resultJson: '{"clients":[{"displayName":"Alex"}]}' },
    ]);
    expect(await fixture.memory.load(PHONE)).toHaveLength(2);
    expect(fixture.strings.get(`whatsapp:memory:${PHONE}`)).not.toContain('tool_');
  });

  it('dispatches two calls and feeds both paired results back', async () => {
    respond.mockResolvedValueOnce(calls(2)).mockResolvedValueOnce(final('Found.'));
    await agent.reply(user, PHONE, 'Find two clients');
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(respond.mock.calls[1]?.[0].messages.filter((message) => message.kind === 'tool_result')).toEqual([
      { kind: 'tool_result', id: 'call-0', resultJson: '{"clients":[{"displayName":"Alex"}]}' },
      { kind: 'tool_result', id: 'call-1', resultJson: '{"clients":[{"displayName":"Alex"}]}' },
    ]);
  });

  it('returns documents to the caller and keeps only text in memory and attachment markers in the model turn', async () => {
    const question = 'Send the itinerary';
    const answer = 'Attached the itinerary.';
    respond.mockResolvedValueOnce({ kind: 'tools', calls: [
      { id: 'document', name: 'send_itinerary', argumentsJson: '{"trip":"TJ-1048"}' },
    ] }).mockResolvedValueOnce(final(answer));
    dispatch.mockImplementationOnce(async (_user, _name, _args, context: ToolContext) => {
      context.documents.push(itinerary);
      return { attached: itinerary.filename };
    });

    expect(await agent.reply(user, PHONE, question)).toEqual({ text: answer, documents: [itinerary] });
    expect(respond.mock.calls[1]?.[0].messages.at(-1)).toEqual({
      kind: 'tool_result', id: 'document', resultJson: JSON.stringify({ attached: itinerary.filename }),
    });
    expect(JSON.stringify(respond.mock.calls)).not.toContain(JSON.stringify(itinerary.body));
    expect(fixture.strings.get(`whatsapp:memory:${PHONE}`)).toBe(JSON.stringify([
      { kind: 'text', role: 'user', text: question }, { kind: 'text', role: 'assistant', text: answer },
    ]));
  });

  it('caps the loop at five AI requests; no sixth request or unused CRM read', async () => {
    for (let round = 0; round < 5; round++) respond.mockResolvedValueOnce(calls());
    respond.mockResolvedValueOnce(final('A sixth request must not happen'));
    expect(await agent.reply(user, PHONE, 'Too broad')).toEqual(textReply(NARROW_QUESTION_REPLY));
    expect(respond).toHaveBeenCalledTimes(5);
    expect(dispatch).toHaveBeenCalledTimes(4);
    expect(await fixture.memory.load(PHONE)).toEqual([]);
  });

  it.each(['Error', 'TimeoutError'])('returns the fallback on %s and leaves memory unchanged', async (name) => {
    await fixture.memory.save(PHONE, [], 'Earlier question', 'Earlier reply');
    const before = fixture.strings.get(`whatsapp:memory:${PHONE}`);
    const error = new Error('private request text');
    error.name = name;
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    respond.mockRejectedValue(error);
    expect(await agent.reply(user, PHONE, 'New question')).toEqual(textReply(AI_UNAVAILABLE_REPLY));
    expect(fixture.strings.get(`whatsapp:memory:${PHONE}`)).toBe(before);
    expect(fixture.redis.setString).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledExactlyOnceWith(`WhatsApp AI failed (${name})`);
  });

  it('does not save a question when AI fails after a tool call', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    respond.mockResolvedValueOnce(calls()).mockRejectedValueOnce(new Error('Failed'));
    expect(await agent.reply(user, PHONE, 'Find Alex')).toEqual(textReply(AI_UNAVAILABLE_REPLY));
    expect(fixture.redis.setString).not.toHaveBeenCalled();
  });

  it('clamps the returned and stored reply to 3,500 characters', async () => {
    respond.mockResolvedValue(final('x'.repeat(4000)));
    expect(await agent.reply(user, PHONE, 'Question')).toEqual(textReply('x'.repeat(3500)));
    expect((await fixture.memory.load(PHONE))[1]?.text).toHaveLength(3500);
  });

  it.each(['reset', 'NEW '])('clears memory for %j without calling AI', async (text) => {
    await fixture.memory.save(PHONE, [], 'Old', 'Old answer');
    expect(await agent.reply(user, PHONE, text)).toEqual(textReply('Conversation cleared. Ready for a new question.'));
    expect(fixture.redis.del).toHaveBeenCalledExactlyOnceWith(`whatsapp:memory:${PHONE}`);
    expect(await fixture.memory.load(PHONE)).toEqual([]);
    expect(respond).not.toHaveBeenCalled();
  });

  it.each([
    ['Asia/Dhaka', 'Fri 20 Nov 2026, 00:00 in Asia/Dhaka'],
    [null, 'Thu 19 Nov 2026, 13:00 in America/New_York'],
  ])('injects the effective clock and tool specifications for a preference of %s', async (timeZone, expected) => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-19T18:00:00Z'));
      const specs = [{ name: 'find_client', description: 'Find a client', parameters: {} }];
      agent = new WhatsappAgent(async () => ({ respond }), fixture.memory, { specs: () => specs, dispatch } as never, settings as never, {} as never, {} as never);
      respond.mockResolvedValue(final('Not on file.'));
      await agent.reply({ ...user, timeZone }, PHONE, 'Question');
      expect(respond.mock.calls[0]?.[0].instructions).toContain(`Now: ${expected} — the Super Admin's time zone.`);
      expect(respond.mock.calls[0]?.[0].instructions).not.toContain('UTC');
      expect(respond.mock.calls[0]?.[0].tools).toEqual(specs);
      expect(settings.read).toHaveBeenCalledTimes(timeZone === null ? 1 : 0);
    } finally { vi.useRealTimers(); }
  });

  it('uses the new clock in the AI round after a successful time zone change', async () => {
    respond.mockResolvedValueOnce({
      kind: 'tools', calls: [{ id: 'zone', name: 'set_my_timezone', argumentsJson: '{"timeZone":"Asia/Dhaka"}' }],
    }).mockResolvedValueOnce(final('Using Asia/Dhaka.'));
    dispatch.mockImplementationOnce(async (_user, _name, _args, context) => {
      context.timeZone = 'Asia/Dhaka';
      return { timeZone: 'Asia/Dhaka' };
    });
    await agent.reply({ ...user, timeZone: null }, PHONE, 'Use Dhaka time');
    expect(respond.mock.calls[0]?.[0].instructions).toContain(' in America/New_York —');
    expect(respond.mock.calls[1]?.[0].instructions).toContain(' in Asia/Dhaka —');
    expect(settings.read).toHaveBeenCalledTimes(1);
  });

  it('trims oldest exchanges to 12 messages and refreshes the 30-minute TTL each write', async () => {
    respond.mockImplementation(async ({ messages }) => {
      const last = messages.at(-1);
      return final(`Reply ${last?.kind === 'text' ? last.text : ''}`);
    });
    for (let index = 0; index < 8; index++) await agent.reply(user, PHONE, `Question ${index}`);
    const history = await fixture.memory.load(PHONE);
    expect(history).toHaveLength(12);
    expect(history[0]?.text).toBe('Question 2');
    expect(history.at(-1)?.text).toBe('Reply Question 7');
    expect(fixture.redis.setString).toHaveBeenCalledTimes(8);
    for (const [key, , ttl] of fixture.redis.setString.mock.calls) {
      expect(key).toBe(`whatsapp:memory:${PHONE}`);
      expect(ttl).toBe(1800);
    }
  });

  it('sends only text history on the next question, with no prior tool rows', async () => {
    respond.mockResolvedValueOnce(calls()).mockResolvedValueOnce(final('Final answer')).mockResolvedValueOnce(final('Next answer'));
    await agent.reply(user, PHONE, 'First question');
    await agent.reply(user, PHONE, 'Next question');
    expect(respond.mock.calls[2]?.[0].messages).toEqual([
      { kind: 'text', role: 'user', text: 'First question' },
      { kind: 'text', role: 'assistant', text: 'Final answer' },
      { kind: 'text', role: 'user', text: 'Next question' },
    ]);
  });

  it('normalises the phone key and keeps different phone histories separate', async () => {
    await fixture.memory.save('+1 555 123 4567', [], 'Question', 'Answer');
    expect(await fixture.memory.load(PHONE)).toHaveLength(2);
    expect(await fixture.memory.load('15550000000')).toEqual([]);
  });

  it('is not ready with a null client and makes no memory write', async () => {
    agent = new WhatsappAgent(async () => null, fixture.memory, { specs: () => [], dispatch } as never, settings as never, {} as never, {} as never);
    expect(await agent.ready()).toBe(false);
    expect(await agent.reply(user, PHONE, 'Question')).toEqual(textReply(AI_UNAVAILABLE_REPLY));
    expect(fixture.redis.setString).not.toHaveBeenCalled();
  });
});

describe('OpenAI adapter and readiness', () => {
  beforeEach(() => { sdk.construct.mockClear(); sdk.create.mockReset(); });

  it.each([{}, { openaiApiKey: 'test-key' }, { openaiModel: 'chosen-model' }, { openaiApiKey: ' ', openaiModel: 'chosen-model' }])('builds no SDK client for incomplete AI config %j', async (ai) => {
    const getClient = whatsappAiClientProvider.useFactory({ ai: async () => ai.openaiApiKey?.trim() && ai.openaiModel ? { apiKey: ai.openaiApiKey, model: ai.openaiModel } : null } as never);
    expect(await getClient()).toBeNull();
    expect(sdk.construct).not.toHaveBeenCalled();
  });

  it('uses the chosen model, a 30-second timeout, at most one retry, and store:false on every request', async () => {
    const getClient = whatsappAiClientProvider.useFactory({ ai: async () => ({ apiKey: 'test-key', model: 'chosen-model' }) } as never);
    const client = (await getClient())!;
    sdk.create.mockResolvedValue({ status: 'completed', output: [], output_text: 'Answer' });
    const input = { instructions: 'Instructions', messages: [{ kind: 'text' as const, role: 'user' as const, text: 'Question' }], tools: [] };
    await client.respond(input);
    await client.respond(input);
    expect(sdk.construct).toHaveBeenCalledExactlyOnceWith({ apiKey: 'test-key', timeout: 30000, maxRetries: 1 });
    for (const [request] of sdk.create.mock.calls) expect(request).toMatchObject({ model: 'chosen-model', store: false, input: [{ role: 'user', content: 'Question' }] });
  });

  it('reuses the client until the stored model or key changes', async () => {
    const ai = vi.fn().mockResolvedValue({ apiKey: 'first-key', model: 'model-one' });
    const getClient = whatsappAiClientProvider.useFactory({ ai } as never);
    const first = await getClient();
    expect(await getClient()).toBe(first);
    ai.mockResolvedValue({ apiKey: 'first-key', model: 'model-two' });
    const second = await getClient();
    expect(second).not.toBe(first);
    ai.mockResolvedValue({ apiKey: 'second-key', model: 'model-two' });
    expect(await getClient()).not.toBe(second);
    expect(sdk.construct).toHaveBeenCalledTimes(3);
    ai.mockResolvedValue(null);
    expect(await getClient()).toBeNull();
  });

  it('maps function calls and their outputs without exposing SDK types to the loop', async () => {
    const client = new OpenAiClient('test-key', 'chosen-model');
    sdk.create.mockResolvedValue({ output: [{ type: 'function_call', call_id: 'c1', name: 'find_client', arguments: '{"query":"Alex"}' }] });
    expect(await client.respond({ instructions: 'Instructions', messages: [], tools: [] })).toEqual({ kind: 'tools', calls: [{ id: 'c1', name: 'find_client', argumentsJson: '{"query":"Alex"}' }] });
    sdk.create.mockResolvedValue({ status: 'completed', output: [], output_text: 'Answer' });
    await client.respond({
      instructions: 'Instructions',
      messages: [
        { kind: 'tool_call', id: 'c1', name: 'find_client', argumentsJson: '{"query":"Alex"}' },
        { kind: 'tool_result', id: 'c1', resultJson: '{"clients":[]}' },
      ],
      tools: [{ name: 'find_client', description: 'Find', parameters: { type: 'object' } }],
    });
    expect(sdk.create.mock.calls[1]?.[0]).toMatchObject({
      store: false,
      input: [
        { type: 'function_call', call_id: 'c1', name: 'find_client', arguments: '{"query":"Alex"}' },
        { type: 'function_call_output', call_id: 'c1', output: '{"clients":[]}' },
      ],
      tools: [{ type: 'function', name: 'find_client', description: 'Find', parameters: { type: 'object' }, strict: false }],
    });
  });
});

describe('WhatsappService sends replies without logging content', () => {
  const message: IncomingMessage = { id: 'wamid.test', from: PHONE, type: 'text', text: 'PRIVATE MESSAGE TEXT', sentAt: new Date() };
  const replyText = 'PRIVATE REPLY TEXT';
  const sender = { markRead: vi.fn(), sendText: vi.fn(), sendDocument: vi.fn() };
  const cancelPending = vi.fn();
  let ai: { openaiApiKey?: string; openaiModel?: string };
  let reply: ReturnType<typeof vi.fn>;
  let findFirst: ReturnType<typeof vi.fn>;
  let service: WhatsappService;
  let logs: ReturnType<typeof vi.spyOn>[];

  beforeEach(() => {
    logs = (['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map((method) => vi.spyOn(Logger.prototype, method).mockImplementation(() => {}));
    sender.markRead.mockReset().mockResolvedValue(undefined);
    sender.sendText.mockReset().mockResolvedValue(true);
    sender.sendDocument.mockReset().mockResolvedValue(true);
    cancelPending.mockReset().mockResolvedValue('');
    ai = { openaiApiKey: 'test-key', openaiModel: 'chosen-model' };
    reply = vi.fn().mockResolvedValue(textReply(replyText));
    findFirst = vi.fn().mockResolvedValue({ id: user.id, email: user.email, role: user.role, permissions: null, status: 'ACTIVE', deletedAt: null, whatsappPhone: PHONE, whatsappPhoneVerifiedAt: new Date() });
    service = new WhatsappService(
      { current: async () => ({}) } as never,
      { read: async () => ({ whatsappAssistantEnabled: true }) } as never,
      { claimOnce: async () => true } as never,
      { user: { findFirst, findUnique: findFirst } } as never,
      // Ready exactly when the provider factory would build a client.
      { ready: async () => Boolean(ai.openaiApiKey && ai.openaiModel), reply, cancelPending } as never,
      sender as never,
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([{ type: 'image', text: null }, { type: 'text', text: null }, { type: 'text', text: '  ' }])('ignores a message with no text body: %j', async (over) => {
    await service.receive([{ ...message, ...over }]);
    expect(reply).not.toHaveBeenCalled();
    expect(sender.sendText).toHaveBeenCalledExactlyOnceWith(PHONE, NON_TEXT_REPLY, message.id);
    expect(logs[0]).toHaveBeenCalledWith(`Ignored non-text WhatsApp message wamid.test (${over.type})`);
  });

  it.each(['openaiApiKey', 'openaiModel'] as const)('warns and never calls the agent when %s is missing', async (key) => {
    delete ai[key];
    await service.receive([message]);
    expect(reply).not.toHaveBeenCalled();
    expect(sender.sendText).toHaveBeenCalledExactlyOnceWith(PHONE, NOT_READY_REPLY, message.id);
    expect(logs[1]).toHaveBeenCalledExactlyOnceWith('WhatsApp assistant accepted a message but the OpenAI key or model is missing from Settings');
  });

  it('resolves when the agent throws and logs no message or reply text', async () => {
    reply.mockRejectedValue(new Error(`${message.text} ${replyText}`));
    await expect(service.receive([message])).resolves.toEqual(['accepted']);
    expect(logs[2]).toHaveBeenCalledExactlyOnceWith('WhatsApp reply preparation failed (Error)');
    expect(sender.sendText).toHaveBeenCalledExactlyOnceWith(PHONE, FAILED_REPLY, message.id);
    const logged = JSON.stringify(logs.map((log) => log.mock.calls));
    expect(logged).not.toContain(message.text);
    expect(logged).not.toContain(replyText);
  });

  it('runs all gates and the real agent/memory; logs only the reply length', async () => {
    const fixture = memoryFixture();
    const agent = new WhatsappAgent(
      async () => ({ respond: async () => final(replyText) }), fixture.memory, { specs: () => [] } as never,
      { read: async () => ({ companyTimeZone: DEFAULT_TIME_ZONE }) } as never,
      { drop: async () => null } as never, {} as never,
    );
    reply.mockImplementation((actingUser, phone, text, allowActions) => agent.reply(actingUser, phone, text, allowActions));
    await service.receive([message]);
    expect(reply).toHaveBeenCalledExactlyOnceWith(user, PHONE, message.text, true);
    expect(sender.markRead).toHaveBeenCalledExactlyOnceWith(message.id);
    expect(sender.markRead).toHaveBeenCalledBefore(reply);
    expect(reply).toHaveBeenCalledBefore(sender.sendText);
    expect(sender.sendText).toHaveBeenCalledExactlyOnceWith(message.from, replyText, message.id);
    expect(sender.sendDocument).not.toHaveBeenCalled();
    expect(logs[0]).toHaveBeenCalledExactlyOnceWith(`Sent a reply to wamid.test (${replyText.length} chars)`);
    const logged = JSON.stringify(logs.map((log) => log.mock.calls));
    expect(logged).not.toContain(message.text);
    expect(logged).not.toContain(replyText);
  });

  it('sends the text first and each document in order to the gated sender', async () => {
    reply.mockResolvedValueOnce({ text: replyText, documents: [itinerary, quote] });
    await expect(service.receive([message])).resolves.toEqual(['accepted']);
    expect(sender.sendText).toHaveBeenCalledExactlyOnceWith(message.from, replyText, message.id);
    expect(sender.sendDocument).toHaveBeenNthCalledWith(1, message.from, itinerary, undefined, message.id);
    expect(sender.sendDocument).toHaveBeenNthCalledWith(2, message.from, quote, undefined, message.id);
    expect(sender.sendText).toHaveBeenCalledBefore(sender.sendDocument);
  });

  it('reports a failed document without cancelling anything or skipping the next document', async () => {
    reply.mockResolvedValueOnce({ text: replyText, documents: [itinerary, quote] });
    sender.sendDocument.mockResolvedValueOnce(false);
    await expect(service.receive([message])).resolves.toEqual(['accepted']);
    expect(sender.sendText).toHaveBeenCalledTimes(2);
    expect(sender.sendText).toHaveBeenNthCalledWith(2, message.from,
      `I couldn't send ${itinerary.filename} — please ask again.`, message.id);
    expect(sender.sendDocument).toHaveBeenNthCalledWith(2, message.from, quote, undefined, message.id);
    expect(cancelPending).not.toHaveBeenCalled();
    const logged = JSON.stringify(logs.flatMap((log) => log.mock.calls));
    for (const value of [itinerary.filename, quote.filename, itinerary.body.toString(), replyText]) {
      expect(logged).not.toContain(value);
    }
  });

  it('still sends the answer when Meta refuses the read receipt', async () => {
    const post = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ error: { code: 12 } }, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', post);
    const transport = new WhatsappSender({ current: async () => ({
      graphVersion: 'v25.0', phoneNumberId: '4321', accessToken: 'test-token',
    }) } as never);
    sender.markRead.mockImplementation(transport.markRead.bind(transport));
    sender.sendText.mockImplementation(transport.sendText.bind(transport));
    await expect(service.receive([message])).resolves.toEqual(['accepted']);
    expect(logs[1]).toHaveBeenCalledWith('WhatsApp mark read failed (HTTP 503, code 12)');
    expect(sender.sendText).toHaveBeenCalledExactlyOnceWith(message.from, replyText, message.id);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('resolves and logs the message id when sending fails', async () => {
    sender.sendText.mockResolvedValue(false);
    await expect(service.receive([message])).resolves.toEqual(['accepted']);
    expect(logs[1]).toHaveBeenCalledWith('Reply to wamid.test was not delivered');
    expect(cancelPending).toHaveBeenCalledExactlyOnceWith(PHONE);
  });

  it('passes confirmation commands through with the AI provider disabled', async () => {
    ai = {};
    await service.receive([{ ...message, text: 'Confirm!' }]);
    expect(reply).toHaveBeenCalledExactlyOnceWith(user, PHONE, 'Confirm!', true);
    expect(cancelPending).not.toHaveBeenCalled();
  });

  it('waits for the first webhook reply before handling a later message', async () => {
    let finishSending!: (delivered: boolean) => void;
    const sending = new Promise<boolean>((resolve) => { finishSending = resolve; });
    sender.sendText.mockReturnValueOnce(sending);
    const first = service.receive([message]);
    await vi.waitFor(() => expect(sender.sendText).toHaveBeenCalledTimes(1));
    const second = service.receive([{ ...message, id: 'wamid.next', text: 'CONFIRM' }]);
    await Promise.resolve();
    expect(reply).toHaveBeenCalledTimes(1);
    finishSending(true);
    await Promise.all([first, second]);
    expect(reply).toHaveBeenNthCalledWith(2, user, PHONE, 'CONFIRM', true);
  });

  it('uses an active, non-deleted SUPER_ADMIN for the linked CLI identity and --as', async () => {
    await service.actingAdmin();
    await service.adminForEmail(` ${user.email} `);
    const active = { deletedAt: null, status: 'ACTIVE', role: 'SUPER_ADMIN' };
    expect(findFirst.mock.calls[0]?.[0].where).toEqual({
      ...active, whatsappPhone: { not: null }, whatsappPhoneVerifiedAt: { not: null },
    });
    expect(findFirst.mock.calls[1]?.[0].where).toEqual({
      ...active, email: { equals: user.email, mode: 'insensitive' },
    });
    findFirst.mockResolvedValueOnce(null);
    expect(await service.adminForEmail('missing@example.com')).toBeNull();
  });
});

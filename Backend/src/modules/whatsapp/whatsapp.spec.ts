import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { buildConfig } from '../../config/configuration.js';
import { validateEnv } from '../../config/env.validation.js';
import { SendLinkCodeDto, updateWhatsappSettingsSchema } from './dto/whatsapp-settings.dto.js';
import { metaSignature, verifyMetaSignature } from './whatsapp.signature.js';
import { readFailedStatuses, readIncomingMessages, type IncomingMessage } from './whatsapp.payload.js';
import { MAX_MESSAGE_AGE_MS, WhatsappService } from './whatsapp.service.js';
import { WhatsappController } from './whatsapp.controller.js';

const SECRET = 'app-secret-for-tests';
const ADMIN_PHONE = '15551234567';

const config = {
  accessToken: 'token',
  phoneNumberId: '1234',
  appSecret: SECRET,
  verifyToken: 'verify-me',
  graphVersion: 'v25.0',
};

/** A payload shaped like Meta's, holding the messages given. */
function payload(messages: unknown[]) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', messages } }] }],
  };
}

function receipts(statuses: unknown[]) {
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ value: { statuses } }] }] };
}

const textMessage = (over: Record<string, unknown> = {}) => ({
  id: 'wamid.1',
  from: ADMIN_PHONE,
  timestamp: String(Math.floor(Date.now() / 1000)),
  type: 'text',
  text: { body: 'What flies today?' },
  ...over,
});

describe('Meta webhook signature', () => {
  const body = Buffer.from(JSON.stringify(payload([textMessage()])));

  it('accepts the HMAC of the raw bytes with the app secret', () => {
    expect(verifyMetaSignature(body, metaSignature(body, SECRET), SECRET)).toBe(true);
  });

  it('refuses another secret, another body, a missing or malformed header', () => {
    expect(verifyMetaSignature(body, metaSignature(body, 'wrong'), SECRET)).toBe(false);
    expect(verifyMetaSignature(Buffer.concat([body, Buffer.from(' ')]), metaSignature(body, SECRET), SECRET)).toBe(false);
    expect(verifyMetaSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyMetaSignature(body, 'sha1=abc', SECRET)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=short', SECRET)).toBe(false);
    expect(verifyMetaSignature(undefined, metaSignature(body, SECRET), SECRET)).toBe(false);
  });

  /** Re-serialising the parsed body is the classic mistake; the bytes differ. */
  it('is over the bytes as sent, not a re-serialised body', () => {
    const sent = Buffer.from('{ "object" : "whatsapp_business_account" }');
    const reserialised = Buffer.from(JSON.stringify(JSON.parse(sent.toString())));
    expect(verifyMetaSignature(reserialised, metaSignature(sent, SECRET), SECRET)).toBe(false);
  });
});

describe('reading Meta payloads', () => {
  it('reads a text message, with the sender as digits', () => {
    const [message] = readIncomingMessages(payload([textMessage({ from: '+1 555 123 4567' })]));
    expect(message).toMatchObject({ id: 'wamid.1', from: ADMIN_PHONE, type: 'text', text: 'What flies today?' });
    expect(message?.sentAt).toBeInstanceOf(Date);
  });

  it('keeps a non-text message with no text, and skips what it cannot read', () => {
    const messages = readIncomingMessages(
      payload([textMessage({ id: 'wamid.2', type: 'image', text: undefined }), { nonsense: true }]),
    );
    expect(messages).toEqual([expect.objectContaining({ id: 'wamid.2', type: 'image', text: null })]);
  });

  it('reads only failed receipt ids and numeric codes', () => {
    const statuses = [
      ...['sent', 'delivered', 'read'].map((status) => ({ id: 'other', status })),
      { id: 'a', status: 'failed', errors: [{ code: 131047 }, null, { code: 12 }] },
      null, { status: 'failed' }, { id: 'b', status: 'failed' },
    ];
    expect(readFailedStatuses(receipts(statuses))).toEqual([{ id: 'a', codes: [131047, 12] }, { id: 'b', codes: [] }]);
    expect(readFailedStatuses(null)).toEqual([]);
    expect(readFailedStatuses({ ...receipts(statuses), object: 'page' })).toEqual([]);
  });

  /** A delivery receipt, another object, or garbage is nothing — never a 400. */
  it('returns nothing for receipts, other objects and garbage', () => {
    expect(readIncomingMessages({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(readIncomingMessages({ ...payload([textMessage()]), object: 'page' })).toEqual([]);
    expect(readIncomingMessages('not json')).toEqual([]);
    expect(readIncomingMessages(null)).toEqual([]);
  });
});

describe('WhatsApp settings configuration', () => {
  const base = {
    DATABASE_URL: 'postgres://x',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };
  const previous = Object.fromEntries([
    'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_APP_SECRET',
    'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_GRAPH_VERSION', 'SUPER_ADMIN_WHATSAPP_PHONE',
    'SUPER_ADMIN_WHATSAPP_EMAIL', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'ANTHROPIC_API_KEY', 'AI_PROVIDER',
  ].map((key) => [key, 'ignored']));

  it('boots without any WhatsApp settings and ignores all eleven old variables', () => {
    const env = validateEnv({ ...base, ...previous });
    for (const key of Object.keys(previous)) expect(env).not.toHaveProperty(key);
    const config = buildConfig(env);
    expect(config.settingsEncryptionKey).toBeUndefined();
    expect(config).not.toHaveProperty('ai');
    expect(config).not.toHaveProperty('whatsapp');
  });

  it('accepts a 32-byte base64 settings key and refuses a wrong-size key', () => {
    const key = Buffer.alloc(32, 71).toString('base64');
    expect(buildConfig(validateEnv({ ...base, SETTINGS_ENCRYPTION_KEY: key })).settingsEncryptionKey).toBe(key);
    expect(() => validateEnv({ ...base, SETTINGS_ENCRYPTION_KEY: 'YWJj' })).toThrow(/SETTINGS_ENCRYPTION_KEY/);
  });

  it('requires a major and minor Graph version when editing settings', () => {
    const input = { currentPassword: 'test-password' };
    expect(updateWhatsappSettingsSchema.safeParse({ ...input, graphVersion: 'v26.1' }).success).toBe(true);
    expect(updateWhatsappSettingsSchema.safeParse({ ...input, graphVersion: '25.0' }).success).toBe(false);
  });

  it('refuses an incomplete phone number', () => {
    const first = SendLinkCodeDto.zodSchema.safeParse({ currentPassword: 'test-password', phone: '555-1234' });
    const second = SendLinkCodeDto.zodSchema.safeParse({ currentPassword: 'test-password', phone: '+1 (555) 123-4567' });
    expect(first.success).toBe(false);
    expect(second).toMatchObject({ success: true, data: { phone: ADMIN_PHONE } });
  });
});

describe('WhatsappService gates', () => {
  let enabled: boolean;
  let configured: typeof config | null;
  let claimed: Set<string>;
  let admin: {
    id: string; email: string; role: string; permissions: null; status: string; deletedAt: Date | null;
    whatsappPhone: string; whatsappPhoneVerifiedAt: Date | null;
  };
  let service: WhatsappService;
  const findUnique = vi.fn();
  const findFirst = vi.fn();
  const sender = { markRead: vi.fn(), sendText: vi.fn(), sendDocument: vi.fn() };
  const agent = { ready: async () => true, reply: vi.fn(), cancelPending: vi.fn() };

  function expectNoSend() {
    expect(sender.markRead).not.toHaveBeenCalled();
    expect(sender.sendText).not.toHaveBeenCalled();
    expect(sender.sendDocument).not.toHaveBeenCalled();
    expect(agent.reply).not.toHaveBeenCalled();
    expect(agent.cancelPending).not.toHaveBeenCalled();
  }

  const message = (over: Partial<IncomingMessage> = {}): IncomingMessage => ({
    id: `wamid.${Math.random()}`,
    from: ADMIN_PHONE,
    type: 'text',
    text: 'hello',
    sentAt: new Date(),
    ...over,
  });

  beforeEach(() => {
    sender.markRead.mockReset().mockResolvedValue(undefined);
    sender.sendText.mockReset().mockResolvedValue(true);
    sender.sendDocument.mockReset().mockResolvedValue(true);
    agent.reply.mockReset().mockResolvedValue({ text: 'A reply.', documents: [] });
    agent.cancelPending.mockReset().mockResolvedValue('');
    enabled = true;
    configured = config;
    claimed = new Set();
    admin = {
      id: 'u1', email: 'owner@example.com', role: 'SUPER_ADMIN', permissions: null,
      status: 'ACTIVE', deletedAt: null, whatsappPhone: ADMIN_PHONE, whatsappPhoneVerifiedAt: new Date(),
    };
    findUnique.mockReset().mockImplementation(async ({ where }) => where.whatsappPhone === ADMIN_PHONE ? admin : null);
    findFirst.mockReset().mockImplementation(async () => admin);
    service = new WhatsappService(
      { current: async () => configured } as never,
      { read: async () => ({ whatsappAssistantEnabled: enabled }) } as never,
      { claimOnce: async (key: string) => !claimed.has(key) && Boolean(claimed.add(key)) } as never,
      { user: { findFirst, findUnique } } as never,
      agent as never,
      sender as never,
    );
  });

  it('accepts a fresh message from the Super Admin phone', async () => {
    expect(await service.receive([message()])).toEqual(['accepted']);
    expect(agent.reply).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: admin.id, role: admin.role, access: expect.any(Object) }), ADMIN_PHONE, 'hello', true,
    );
  });

  it('drops everything while the server is not configured', async () => {
    configured = null;
    expect(await service.receive([message()])).toEqual(['not_configured']);
    expectNoSend();
  });

  it('drops everything while Settings has it switched off', async () => {
    enabled = false;
    expect(await service.receive([message()])).toEqual(['switched_off']);
    expectNoSend();
  });

  it('drops a phone number with no linked account', async () => {
    expect(await service.receive([message({ from: '15550000000' })])).toEqual(['unknown_sender']);
    expectNoSend();
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { whatsappPhone: '15550000000' } }));
  });

  /** Meta redelivers until it sees a 200; an approval must run once. */
  it('handles a redelivered message once', async () => {
    const once = message({ id: 'wamid.same' });
    expect(await service.receive([once])).toEqual(['accepted']);
    sender.markRead.mockClear();
    sender.sendText.mockClear();
    agent.reply.mockClear();
    expect(await service.receive([once])).toEqual(['duplicate']);
    expectNoSend();
  });

  it('does not act on a message older than the limit', async () => {
    const now = new Date();
    const old = message({ sentAt: new Date(now.getTime() - MAX_MESSAGE_AGE_MS - 1) });
    expect(await service.receive([old], now)).toEqual(['stale']);
    expectNoSend();
  });

  /** Suspended, archived or demoted in the web app: the bot stops at once. */
  it.each([
    { status: 'SUSPENDED' }, { role: 'ADMIN' }, { deletedAt: new Date() },
  ])('answers nobody when the linked account is no longer an active Super Admin: %j', async (change) => {
    Object.assign(admin, change);
    expect(await service.receive([message()])).toEqual(['no_admin']);
    expectNoSend();
  });

  it('silently drops an unverified number', async () => {
    admin.whatsappPhoneVerifiedAt = null;
    expect(await service.receive([message()])).toEqual(['unknown_sender']);
    expectNoSend();
  });

  it('acts as the Super Admin with their own permission set', async () => {
    const user = await service.actingAdmin();
    expect(user).toMatchObject({ id: 'u1', email: 'owner@example.com', role: 'SUPER_ADMIN' });
    expect(user?.access).toBeDefined();
  });
});

describe('WhatsappController', () => {
  let configured: typeof config | null;
  const receive = vi.fn(async () => []);
  const controller = () =>
    new WhatsappController({ current: async () => configured } as never, { receive } as never);

  beforeEach(() => {
    configured = config;
    receive.mockClear();
  });

  describe('verification', () => {
    const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '1158201444' };

    /** Meta compares the body to its challenge: plain bytes, no envelope. */
    it('echoes the challenge as plain bytes when the token matches', async () => {
      const file = await controller().verify(query);
      const chunks: Buffer[] = [];
      for await (const chunk of file.getStream()) chunks.push(Buffer.from(chunk as Buffer));
      expect(Buffer.concat(chunks).toString()).toBe('1158201444');
    });

    it('refuses a wrong token or mode with 403', async () => {
      await expect(controller().verify({ ...query, 'hub.verify_token': 'nope' })).rejects.toThrow(ForbiddenException);
      await expect(controller().verify({ ...query, 'hub.mode': 'unsubscribe' })).rejects.toThrow(ForbiddenException);
    });

    it('is a 404 while the assistant is not configured', async () => {
      configured = null;
      await expect(controller().verify(query)).rejects.toThrow(NotFoundException);
    });
  });

  describe('events', () => {
    const body = payload([textMessage()]);
    const raw = Buffer.from(JSON.stringify(body));

    it('refuses an unsigned or mis-signed post with 401, handling nothing', async () => {
      await expect(controller().receive({ rawBody: raw } as never, undefined, body)).rejects.toThrow(UnauthorizedException);
      await expect(controller().receive({ rawBody: raw } as never, metaSignature(raw, 'wrong'), body)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(receive).not.toHaveBeenCalled();
    });

    it('acknowledges signed receipts with 200 and logs only the failed id and codes', async () => {
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      try {
        const statuses = receipts([{ id: 'wamid.failed', status: 'failed', recipient_id: ADMIN_PHONE,
          errors: [{ code: 131047, title: 'PRIVATE TITLE' }] }]);
        const bytes = Buffer.from(JSON.stringify(statuses));
        expect(Reflect.getMetadata(HTTP_CODE_METADATA, Reflect.get(WhatsappController.prototype, 'receive'))).toBe(200);
        expect(await controller().receive({ rawBody: bytes } as never, metaSignature(bytes, SECRET), statuses)).toEqual({ received: 0 });
        expect(warn).toHaveBeenCalledExactlyOnceWith('WhatsApp message wamid.failed failed at Meta (codes: 131047)');
        expect(receive).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('answers a signed post and hands its messages on', async () => {
      expect(await controller().receive({ rawBody: raw } as never, metaSignature(raw, SECRET), body)).toEqual({ received: 1 });
      expect(receive).toHaveBeenCalledWith([expect.objectContaining({ id: 'wamid.1', from: ADMIN_PHONE })]);
    });

    it('is a 404 while the assistant is not configured', async () => {
      configured = null;
      await expect(controller().receive({ rawBody: raw } as never, metaSignature(raw, SECRET), body)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

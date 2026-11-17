import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { validateEnv } from '../../config/env.validation.js';
import { metaSignature, verifyMetaSignature } from './whatsapp.signature.js';
import { readIncomingMessages, type IncomingMessage } from './whatsapp.payload.js';
import { MAX_MESSAGE_AGE_MS, WhatsappService } from './whatsapp.service.js';
import { WhatsappController } from './whatsapp.controller.js';

const SECRET = 'app-secret-for-tests';
const ADMIN_PHONE = '15551234567';

const config = {
  accessToken: 'token',
  phoneNumberId: '1234',
  appSecret: SECRET,
  verifyToken: 'verify-me',
  graphVersion: 'v21.0',
  adminPhone: ADMIN_PHONE,
  adminEmail: 'owner@example.com',
};

/** A payload shaped like Meta's, holding the messages given. */
function payload(messages: unknown[]) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', messages } }] }],
  };
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

  /** A delivery receipt, another object, or garbage is nothing — never a 400. */
  it('returns nothing for receipts, other objects and garbage', () => {
    expect(readIncomingMessages({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(readIncomingMessages({ ...payload([textMessage()]), object: 'page' })).toEqual([]);
    expect(readIncomingMessages('not json')).toEqual([]);
    expect(readIncomingMessages(null)).toEqual([]);
  });
});

describe('WhatsApp env', () => {
  const base = {
    DATABASE_URL: 'postgres://x',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };
  const full = {
    WHATSAPP_ACCESS_TOKEN: 't',
    WHATSAPP_PHONE_NUMBER_ID: '1',
    WHATSAPP_APP_SECRET: 's',
    WHATSAPP_VERIFY_TOKEN: 'v',
    SUPER_ADMIN_WHATSAPP_PHONE: '+15551234567',
    SUPER_ADMIN_WHATSAPP_EMAIL: 'owner@example.com',
  };

  it('boots with all of it or none of it', () => {
    expect(() => validateEnv(base)).not.toThrow();
    expect(() => validateEnv({ ...base, ...full })).not.toThrow();
  });

  it('refuses a partial set, naming what is missing', () => {
    const { WHATSAPP_APP_SECRET: _omitted, ...partial } = full;
    expect(() => validateEnv({ ...base, ...partial })).toThrow(/WHATSAPP_APP_SECRET is missing/);
  });

  it('refuses a phone that is not E.164', () => {
    expect(() => validateEnv({ ...base, ...full, SUPER_ADMIN_WHATSAPP_PHONE: '555-1234' })).toThrow(/E\.164/);
  });
});

describe('WhatsappService gates', () => {
  let enabled: boolean;
  let configured: typeof config | null;
  let claimed: Set<string>;
  let admin: { id: string; email: string; role: string; permissions: null } | null;
  let service: WhatsappService;
  const findFirst = vi.fn();

  const message = (over: Partial<IncomingMessage> = {}): IncomingMessage => ({
    id: `wamid.${Math.random()}`,
    from: ADMIN_PHONE,
    type: 'text',
    text: 'hello',
    sentAt: new Date(),
    ...over,
  });

  beforeEach(() => {
    enabled = true;
    configured = config;
    claimed = new Set();
    admin = { id: 'u1', email: 'owner@example.com', role: 'SUPER_ADMIN', permissions: null };
    findFirst.mockReset().mockImplementation(async () => admin);
    service = new WhatsappService(
      { get whatsapp() { return configured; } } as never,
      { read: async () => ({ whatsappAssistantEnabled: enabled }) } as never,
      { claimOnce: async (key: string) => !claimed.has(key) && Boolean(claimed.add(key)) } as never,
      { user: { findFirst } } as never,
    );
  });

  it('accepts a fresh message from the Super Admin phone', async () => {
    expect(await service.receive([message()])).toEqual(['accepted']);
  });

  it('drops everything while the server is not configured', async () => {
    configured = null;
    expect(await service.receive([message()])).toEqual(['not_configured']);
  });

  it('drops everything while Settings has it switched off', async () => {
    enabled = false;
    expect(await service.receive([message()])).toEqual(['switched_off']);
  });

  it('drops any other number, without looking up the admin', async () => {
    expect(await service.receive([message({ from: '15550000000' })])).toEqual(['unknown_sender']);
    expect(findFirst).not.toHaveBeenCalled();
  });

  /** Meta redelivers until it sees a 200; an approval must run once. */
  it('handles a redelivered message once', async () => {
    const once = message({ id: 'wamid.same' });
    expect(await service.receive([once, once])).toEqual(['accepted', 'duplicate']);
  });

  it('does not act on a message older than the limit', async () => {
    const now = new Date();
    const old = message({ sentAt: new Date(now.getTime() - MAX_MESSAGE_AGE_MS - 1) });
    expect(await service.receive([old], now)).toEqual(['stale']);
  });

  /** Suspended, archived or demoted in the web app: the bot stops at once. */
  it('answers nobody when the env names no active Super Admin', async () => {
    admin = null;
    expect(await service.receive([message()])).toEqual(['no_admin']);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'SUPER_ADMIN', status: 'ACTIVE', deletedAt: null }),
      }),
    );
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
    new WhatsappController({ get whatsapp() { return configured; } } as never, { receive } as never);

  beforeEach(() => {
    configured = config;
    receive.mockClear();
  });

  describe('verification', () => {
    const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '1158201444' };

    /** Meta compares the body to its challenge: plain bytes, no envelope. */
    it('echoes the challenge as plain bytes when the token matches', async () => {
      const file = controller().verify(query);
      const chunks: Buffer[] = [];
      for await (const chunk of file.getStream()) chunks.push(Buffer.from(chunk as Buffer));
      expect(Buffer.concat(chunks).toString()).toBe('1158201444');
    });

    it('refuses a wrong token or mode with 403', () => {
      expect(() => controller().verify({ ...query, 'hub.verify_token': 'nope' })).toThrow(ForbiddenException);
      expect(() => controller().verify({ ...query, 'hub.mode': 'unsubscribe' })).toThrow(ForbiddenException);
    });

    it('is a 404 while the assistant is not configured', () => {
      configured = null;
      expect(() => controller().verify(query)).toThrow(NotFoundException);
    });
  });

  describe('events', () => {
    const body = payload([textMessage()]);
    const raw = Buffer.from(JSON.stringify(body));

    it('refuses an unsigned or mis-signed post with 401, handling nothing', () => {
      expect(() => controller().receive({ rawBody: raw } as never, undefined, body)).toThrow(UnauthorizedException);
      expect(() => controller().receive({ rawBody: raw } as never, metaSignature(raw, 'wrong'), body)).toThrow(
        UnauthorizedException,
      );
      expect(receive).not.toHaveBeenCalled();
    });

    it('answers a signed post and hands its messages on', () => {
      expect(controller().receive({ rawBody: raw } as never, metaSignature(raw, SECRET), body)).toEqual({ received: 1 });
      expect(receive).toHaveBeenCalledWith([expect.objectContaining({ id: 'wamid.1', from: ADMIN_PHONE })]);
    });

    it('is a 404 while the assistant is not configured', () => {
      configured = null;
      expect(() => controller().receive({ rawBody: raw } as never, metaSignature(raw, SECRET), body)).toThrow(
        NotFoundException,
      );
    });
  });
});

import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { HEADERS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { Action, Module, Reach } from '../../common/authorization/access.js';
import { RATE_LIMIT_KEY } from '../../common/constants/auth.constants.js';
import { SecretBox } from '../../common/crypto/secret-box.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { UserRole, VerificationPurpose } from '../../generated/prisma/enums.js';
import { importWhatsappEnv } from '../../scripts/whatsapp-import-env.js';
import { TokenService } from '../auth/token.service.js';
import { RevealWhatsappSecretDto, SendLinkCodeDto, SetWhatsappAssistantDto, VerifyWhatsappPhoneDto } from './dto/whatsapp-settings.dto.js';
import { WhatsappConnectionsService } from './whatsapp-connections.service.js';
import { WhatsappHistoryService } from './whatsapp-history.service.js';
import { WhatsappPhoneService } from './whatsapp-phone.service.js';
import { WhatsappSettingsController } from './whatsapp-settings.controller.js';
import { WhatsappSettingsService } from './whatsapp-settings.service.js';

const userId = 'owner-id';
const password = 'password-fixture';
const phone = '15551234567';
const phoneId = '00000000-0000-4000-8000-000000000001';
const phoneRow = { id: phoneId, userId, phone, label: 'Work', verifiedAt: new Date(), deletedAt: null };
const purpose = VerificationPurpose.WHATSAPP_LINK;
const key = Buffer.alloc(32, 3).toString('base64');
const secrets = {
  openaiApiKey: 'private-openai-api-key-fixture-1a2b',
  accessToken: 'private-meta-access-token-fixture-2c3d',
  appSecret: 'private-meta-app-secret-fixture-3e4f',
  verifyToken: 'private-meta-verify-token-fixture-4a5b',
};

function fixture(encryptionReady = true) {
  const config = {
    apiPublicUrl: 'https://crm.example.com/',
    settingsEncryptionKey: encryptionReady ? key : undefined,
    verification: { twoFactorTtlMinutes: 7 },
  };
  const box = new SecretBox(config as never);
  const row: {
    id: number; assistantEnabled: boolean; openaiModel: string | null; graphVersion: string; phoneNumberId: string | null;
    openaiApiKey: string | null; accessToken: string | null; appSecret: string | null; verifyToken: string | null;
  } = {
    id: 1, assistantEnabled: false, openaiModel: null, graphVersion: 'v25.0', phoneNumberId: null,
    openaiApiKey: null, accessToken: null, appSecret: null, verifyToken: null,
  };
  const prisma = {
    whatsappSettings: {
      upsert: vi.fn(async ({ update }) => ({ ...Object.assign(row, update) })),
      updateMany: vi.fn(async ({ where, data }) => {
        if (Object.entries(where).some(([field, value]) => row[field as keyof typeof row] !== value)) {
          return { count: 0 };
        }
        Object.assign(row, data);
        return { count: 1 };
      }),
    },
    user: { findFirst: vi.fn().mockResolvedValue({ id: userId }), update: vi.fn() },
    whatsappPhone: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(async ({ create }) => ({ ...phoneRow, ...create })),
      update: vi.fn().mockImplementation(async ({ data }) => ({ ...phoneRow, ...data })),
    },
    verificationCode: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (write) => write(prisma));
  const audit = { record: vi.fn() };
  const auth = { assertPassword: vi.fn() };
  const settings = new WhatsappSettingsService(prisma as never, box, config as never, auth as never, audit as never);
  const verification = {
    issue: vi.fn().mockResolvedValue({ challengeToken: 'opaque-fixture', code: '345678', expiresAt: new Date(Date.now() + 420_000) }),
    verify: vi.fn().mockResolvedValue({ userId, target: phone }),
    cancel: vi.fn(),
  };
  const sender = { sendText: vi.fn().mockResolvedValue(true) };
  const pending = { take: vi.fn() };
  const memory = { reset: vi.fn() };
  const phones = new WhatsappPhoneService(
    prisma as never, auth as never, verification as never,
    settings, config as never, sender as never, audit as never, pending as never, memory as never,
  );
  const setupMeta = () => settings.update(userId, { currentPassword: password, phoneNumberId: '9001', ...secrets }, {});
  return { settings, phones, box, row, prisma, audit, auth, verification, sender, pending, memory, setupMeta };
}

describe('WhatsApp credential settings', () => {
  it('starts unconfigured, reads a singleton and returns only masks after setting credentials', async () => {
    const { settings, prisma, row, setupMeta } = fixture();
    expect(await settings.current()).toBeNull();
    expect(await settings.current()).toBeNull();
    expect(prisma.whatsappSettings.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { id: 1 }, create: { id: 1 }, update: {},
    });
    await setupMeta();
    const view = await settings.view(userId);
    for (const [field, secret] of Object.entries(secrets)) {
      expect(view[field as keyof typeof secrets]).toEqual({
        set: true, last4: secret.slice(-4), masked: '•'.repeat(12) + secret.slice(-4),
      });
      expect(JSON.stringify(view)).not.toContain(secret);
      expect(JSON.stringify(row)).not.toContain(secret);
    }
    expect(view).toMatchObject({
      phoneNumberId: '9001', graphVersion: 'v25.0', encryptionReady: true,
      webhookUrl: 'https://crm.example.com/api/webhooks/whatsapp',
      assistantEnabled: false,
      readiness: { openai: false, meta: true, metaMissing: [], phonesLinked: 0, phoneLimit: 5, encryptionReady: true },
    });
    expect(await settings.current()).toMatchObject({ appSecret: secrets.appSecret });
  });

  it('invalidates both reads after setting, replacing or clearing a secret and audits only field names', async () => {
    const { settings, prisma, audit, row, setupMeta } = fixture();
    await setupMeta();
    expect(await settings.ai()).toBeNull();
    await settings.update(userId, { currentPassword: password, openaiModel: 'model-one' }, {});
    expect(await settings.ai()).toEqual({ apiKey: secrets.openaiApiKey, model: 'model-one' });
    const savedAccess = row.accessToken;
    const replacement = 'replacement-fixture-xyz7';
    const view = await settings.update(userId, { currentPassword: password, openaiApiKey: replacement, appSecret: null }, {});
    expect(row.accessToken).toBe(savedAccess);
    expect(prisma.whatsappSettings.updateMany.mock.lastCall?.[0].data).not.toHaveProperty('accessToken');
    expect(view.openaiApiKey).toEqual({ set: true, last4: 'xyz7', masked: '•'.repeat(12) + 'xyz7' });
    expect(view.appSecret).toEqual({ set: false, last4: null, masked: null });
    expect(view.readiness.metaMissing).toEqual(['appSecret']);
    expect(await settings.current()).toBeNull();
    expect(await settings.ai()).toEqual({ apiKey: replacement, model: 'model-one' });
    expect(audit.record.mock.lastCall?.[0]).toMatchObject({
      action: 'whatsapp_settings.updated', entityType: 'WhatsappSettings', metadata: { fields: ['openaiApiKey', 'appSecret'] },
    });
    const trail = JSON.stringify(audit.record.mock.calls);
    for (const value of [...Object.values(secrets), replacement, 'model-one', password]) expect(trail).not.toContain(value);
  });

  it('refuses a wrong password before writing', async () => {
    const { auth, settings, prisma, audit } = fixture();
    auth.assertPassword.mockRejectedValue(new BadRequestException('Your current password is incorrect'));
    await expect(settings.update(userId, { currentPassword: password, ...secrets }, {})).rejects.toThrow(BadRequestException);
    expect(auth.assertPassword).toHaveBeenCalledExactlyOnceWith(userId, password);
    expect(prisma.whatsappSettings.updateMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('reads as unavailable and refuses secrets if the encryption key is absent', async () => {
    const { settings, prisma } = fixture(false);
    expect(await settings.view(userId)).toMatchObject({ encryptionReady: false, accessToken: { set: false, last4: null } });
    expect(await settings.ai()).toBeNull();
    expect(await settings.current()).toBeNull();
    await expect(settings.update(userId, { currentPassword: password, accessToken: secrets.accessToken }, {}))
      .rejects.toThrow('Set SETTINGS_ENCRYPTION_KEY on the server first');
    expect(prisma.whatsappSettings.updateMany).not.toHaveBeenCalled();
  });

  it('treats an unreadable stored secret as absent and logs only the class', async () => {
    const { settings, prisma } = fixture();
    const stored = new SecretBox({ settingsEncryptionKey: Buffer.alloc(32, 4).toString('base64') } as never)
      .sealSecret(secrets.appSecret);
    prisma.whatsappSettings.upsert.mockImplementationOnce(async () => ({
      id: 1, assistantEnabled: false, openaiModel: null, graphVersion: 'v25.0', phoneNumberId: null,
      openaiApiKey: null, accessToken: null, verifyToken: null, appSecret: stored,
    }));
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    try {
      expect((await settings.view(userId)).appSecret).toEqual({ set: false, last4: null, masked: null });
      expect(warn).toHaveBeenCalledExactlyOnceWith('SecretOpenError');
    } finally {
      warn.mockRestore();
    }
  });
});

describe('WhatsApp secret reveal', () => {
  it.each(Object.keys(secrets) as (keyof typeof secrets)[])('reveals %s and audits only its name', async (field) => {
    const { settings, setupMeta, auth, audit } = fixture();
    await setupMeta();
    expect(await settings.reveal(userId, { field, currentPassword: password }, {})).toEqual({ field, value: secrets[field] });
    expect(auth.assertPassword).toHaveBeenLastCalledWith(userId, password);
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({
      action: 'whatsapp_settings.revealed', metadata: { field },
    }));
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain(secrets[field]);
  });

  it('refuses a wrong password before reading the secret', async () => {
    const { settings, prisma, auth, audit } = fixture();
    auth.assertPassword.mockRejectedValue(new BadRequestException('Your current password is incorrect'));
    await expect(settings.reveal(userId, { field: 'verifyToken', currentPassword: password }, {}))
      .rejects.toMatchObject({ status: 400, message: 'Your current password is incorrect' });
    expect(prisma.whatsappSettings.upsert).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('returns safe errors for unset secrets, unreadable secrets and missing encryption', async () => {
    const input = { field: 'verifyToken', currentPassword: password } as const;
    const { settings, row, audit } = fixture();
    await expect(settings.reveal(userId, input, {})).rejects.toMatchObject({ status: 400, message: 'That secret is not set' });
    row.verifyToken = new SecretBox({ settingsEncryptionKey: Buffer.alloc(32, 4).toString('base64') } as never)
      .sealSecret(secrets.verifyToken);
    await expect(settings.reveal(userId, input, {})).rejects.toMatchObject({
      status: 409, message: "That secret cannot be read with this server's key. Replace it.",
    });
    expect(audit.record).not.toHaveBeenCalled();
    await expect(fixture(false).settings.reveal(userId, input, {}))
      .rejects.toMatchObject({ status: 400, message: 'Set SETTINGS_ENCRYPTION_KEY on the server first' });
  });

  it('validates the body and returns 200 with no-store and no route limit', () => {
    const schema = RevealWhatsappSecretDto.zodSchema;
    expect(schema.safeParse({ field: 'openaiModel', currentPassword: password }).success).toBe(false);
    expect(schema.safeParse({ field: 'verifyToken' }).success).toBe(false);
    expect(schema.safeParse({ field: 'verifyToken', currentPassword: password, extra: true }).success).toBe(false);
    const handler = Reflect.get(WhatsappSettingsController.prototype, 'reveal');
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(200);
    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toEqual([{ name: 'Cache-Control', value: 'no-store' }]);
    expect(Reflect.getMetadata(RATE_LIMIT_KEY, handler)).toBeUndefined();
  });
});

describe('WhatsApp assistant switch', () => {
  it('requires a correct password before switching on', async () => {
    const { settings, auth, prisma } = fixture();
    await expect(settings.setAssistant(userId, { enabled: true }, {}))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining('currentPassword') });
    expect(auth.assertPassword).not.toHaveBeenCalled();
    auth.assertPassword.mockRejectedValueOnce(new BadRequestException('Your current password is incorrect'));
    await expect(settings.setAssistant(userId, { enabled: true, currentPassword: password }, {}))
      .rejects.toMatchObject({ status: 400, message: 'Your current password is incorrect' });
    expect(prisma.whatsappSettings.upsert).not.toHaveBeenCalled();
  });

  it('switches on before readiness, clears the cache and switches off without reauth', async () => {
    const { settings, auth, audit, row } = fixture(false);
    expect(await settings.assistantEnabled()).toBe(false);
    const enabled = await settings.setAssistant(userId, { enabled: true, currentPassword: password }, {});
    expect(enabled).toMatchObject({ assistantEnabled: true, readiness: {
      openai: false, meta: false, metaMissing: ['phoneNumberId', 'accessToken', 'appSecret', 'verifyToken'],
      phonesLinked: 0, encryptionReady: false,
    } });
    expect(await settings.assistantEnabled()).toBe(true);
    expect(row.assistantEnabled).toBe(true);
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'whatsapp_assistant.switched_on' }));
    expect((await settings.setAssistant(userId, { enabled: false }, {})).assistantEnabled).toBe(false);
    expect(await settings.assistantEnabled()).toBe(false);
    await settings.setAssistant(userId, { enabled: false, currentPassword: 'unused-password' }, {});
    expect(auth.assertPassword).toHaveBeenCalledExactlyOnceWith(userId, password);
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'whatsapp_assistant.switched_off' }));
  });

  it('accepts a boolean and an optional password only and has no route limit', () => {
    const schema = SetWhatsappAssistantDto.zodSchema;
    expect(schema.safeParse({ enabled: false }).success).toBe(true);
    expect(schema.safeParse({ enabled: false, currentPassword: '' }).success).toBe(true);
    expect(schema.safeParse({ enabled: false, currentPassword: password }).success).toBe(true);
    expect(schema.safeParse({ enabled: 'false' }).success).toBe(false);
    expect(schema.safeParse({ enabled: false, extra: true }).success).toBe(false);
    expect(Reflect.getMetadata(RATE_LIMIT_KEY, Reflect.get(WhatsappSettingsController.prototype, 'setAssistant'))).toBeUndefined();
  });

  it('masks short secrets and reports OpenAI and phone readiness from stored values', async () => {
    const { settings, prisma } = fixture();
    prisma.whatsappPhone.count.mockResolvedValue(2);
    const view = await settings.update(userId, { currentPassword: password, openaiApiKey: '1234', openaiModel: 'model-one' }, {});
    expect(view.openaiApiKey).toEqual({ set: true, last4: null, masked: '•'.repeat(12) });
    expect(view.readiness).toMatchObject({ openai: true, phonesLinked: 2 });
  });
});

describe('legacy WhatsApp settings import', () => {
  it('fills empty fields only, seals the secrets, invalidates the cache and prints only field names', async () => {
    const { settings, row, prisma, audit, auth, box } = fixture();
    row.openaiModel = 'saved-model';
    // A credential sealed with another key is still a value saved in the panel.
    row.verifyToken = new SecretBox({ settingsEncryptionKey: Buffer.alloc(32, 8).toString('base64') } as never)
      .sealSecret('previous-credential');
    const previousToken = row.verifyToken;
    expect(await settings.ai()).toBeNull();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await importWhatsappEnv(settings, {
        SETTINGS_ENCRYPTION_KEY: key,
        OPENAI_API_KEY: secrets.openaiApiKey,
        OPENAI_MODEL: 'legacy-model',
        WHATSAPP_ACCESS_TOKEN: secrets.accessToken,
        WHATSAPP_PHONE_NUMBER_ID: '54321',
        WHATSAPP_APP_SECRET: secrets.appSecret,
        WHATSAPP_VERIFY_TOKEN: secrets.verifyToken,
        WHATSAPP_GRAPH_VERSION: 'v26.0',
        SUPER_ADMIN_WHATSAPP_PHONE: phone,
      });
      expect(row.openaiModel).toBe('saved-model');
      expect(row.verifyToken).toBe(previousToken);
      expect(row.graphVersion).toBe('v25.0');
      expect(box.openSecret(row.openaiApiKey!)).toBe(secrets.openaiApiKey);
      expect(box.openSecret(row.appSecret!)).toBe(secrets.appSecret);
      expect(box.openSecret(row.accessToken!)).toBe(secrets.accessToken);
      expect(await settings.ai()).toEqual({ apiKey: secrets.openaiApiKey, model: 'saved-model' });
      expect(auth.assertPassword).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
        actorId: null, action: 'whatsapp_settings.imported',
        metadata: { fields: ['openaiApiKey', 'phoneNumberId', 'accessToken', 'appSecret'] },
      }));
      expect(log.mock.calls.flat()).toEqual([
        'Imported: openaiApiKey, phoneNumberId, accessToken, appSecret',
        'Skipped: openaiModel, graphVersion, verifyToken',
        'The Super Admin phone is skipped. Link it with a WhatsApp code in Settings.',
      ]);
    } finally {
      log.mockRestore();
    }
  });

  it('refuses without the encryption key before any database operation', async () => {
    const { settings, prisma } = fixture(false);
    await expect(importWhatsappEnv(settings, { OPENAI_API_KEY: secrets.openaiApiKey }))
      .rejects.toThrow('Set SETTINGS_ENCRYPTION_KEY on the server first');
    await expect(settings.importLegacy({ openaiApiKey: secrets.openaiApiKey }))
      .rejects.toThrow('Set SETTINGS_ENCRYPTION_KEY on the server first');
    expect(prisma.whatsappSettings.upsert).not.toHaveBeenCalled();
    expect(prisma.whatsappSettings.updateMany).not.toHaveBeenCalled();
  });

  it('skips a concurrent panel save and can still fill the other empty fields', async () => {
    const { settings, row, prisma } = fixture();
    prisma.whatsappSettings.updateMany.mockImplementationOnce(async () => {
      row.openaiModel = 'panel-model';
      return { count: 0 };
    });
    const outcome = await settings.importLegacy({ openaiModel: 'legacy-model', phoneNumberId: '54321' });
    expect(outcome.imported).toEqual(['phoneNumberId']);
    expect(outcome.skipped).toContain('openaiModel');
    expect(row.openaiModel).toBe('panel-model');
    expect(row.phoneNumberId).toBe('54321');
    expect(prisma.whatsappSettings.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 1, openaiModel: null, phoneNumberId: null },
    }));
    expect((await settings.importLegacy({ openaiModel: 'legacy-model', phoneNumberId: '67890' })).imported).toEqual([]);
    expect(prisma.whatsappSettings.updateMany).toHaveBeenCalledTimes(2);
  });
});

describe('WhatsApp phone linking', () => {
  const input = { phone: '+1 (555) 123-4567', label: ' Work ', currentPassword: password };
  const verifyInput = { code: '345678', label: 'Work' };

  it('checks the password before requiring a trimmed name and refuses a sixth phone before sending', async () => {
    const { phones, prisma, auth, verification, sender } = fixture();
    const missing = SendLinkCodeDto.zodSchema.parse({ phone, currentPassword: password });
    await expect(phones.sendCode(userId, missing, {})).rejects.toMatchObject({ response: { errors: { label: 'Enter a phone name' } } });
    expect(auth.assertPassword).toHaveBeenCalledExactlyOnceWith(userId, password);
    expect(prisma.whatsappPhone.count).not.toHaveBeenCalled();
    expect(VerifyWhatsappPhoneDto.zodSchema.safeParse({ code: verifyInput.code }).success).toBe(false);

    prisma.whatsappPhone.count.mockResolvedValue(5);
    await expect(phones.sendCode(userId, input, {})).rejects.toThrow('You can link up to five phones. Unlink one first.');
    expect(prisma.whatsappPhone.findFirst).not.toHaveBeenCalled();
    expect(verification.issue).not.toHaveBeenCalled();
    expect(sender.sendText).not.toHaveBeenCalled();
  });

  it('checks a trimmed phone name against this user’s live rows', async () => {
    const { phones, prisma, verification } = fixture();
    prisma.whatsappPhone.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: phoneId });
    await expect(phones.sendCode(userId, input, {})).rejects.toThrow('You already have a phone called Work.');
    expect(prisma.whatsappPhone.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { userId, deletedAt: null, label: { equals: 'Work', mode: 'insensitive' } },
    }));
    expect(verification.issue).not.toHaveBeenCalled();
  });

  it('refuses another user’s number, incomplete Meta settings and a wrong password before issuance', async () => {
    const { phones, prisma, auth, verification, sender } = fixture();
    prisma.whatsappPhone.findFirst.mockResolvedValueOnce({ userId: 'somebody-else' });
    await expect(phones.sendCode(userId, input, {})).rejects.toThrow(ConflictException);
    await expect(phones.sendCode(userId, input, {})).rejects.toThrow('Finish the Meta settings first');
    auth.assertPassword.mockRejectedValueOnce(new BadRequestException('Your current password is incorrect'));
    await expect(phones.sendCode(userId, input, {})).rejects.toThrow(BadRequestException);
    expect(verification.issue).not.toHaveBeenCalled();
    expect(sender.sendText).not.toHaveBeenCalled();
  });

  it('sends the code and configured expiry to the normalised target on WhatsApp', async () => {
    const { phones, verification, sender, setupMeta, audit } = fixture();
    await setupMeta();
    const result = await phones.sendCode(userId, input, {});
    expect(verification.issue).toHaveBeenCalledExactlyOnceWith(userId, purpose, { target: phone });
    expect(sender.sendText).toHaveBeenCalledExactlyOnceWith(phone, 'Your Tribeca Jets code is 345678. Enter it in Settings › WhatsApp & AI, not in this chat. It expires in 7 minutes.');
    expect(audit.record).toHaveBeenLastCalledWith(expect.objectContaining({
      action: 'user.whatsapp_link_code_sent', entityId: userId, metadata: { fields: ['target'] },
    }));
    expect(result).toEqual({ challengeToken: 'opaque-fixture', ttlMs: expect.any(Number) });
  });

  it('cancels a code if the transport reports failure and throws a safe 502', async () => {
    const { phones, verification, sender, setupMeta } = fixture();
    await setupMeta();
    sender.sendText.mockResolvedValueOnce(false);
    await expect(phones.sendCode(userId, input, {})).rejects.toThrow(BadGatewayException);
    expect(verification.cancel).toHaveBeenCalledExactlyOnceWith('opaque-fixture', purpose);
  });

  it('links only the verified target to the caller and audits the last four digits', async () => {
    const { phones, verification, prisma, audit } = fixture();
    const linked = await phones.verify(userId, 'opaque-fixture', verifyInput, {});
    expect(verification.verify).toHaveBeenCalledExactlyOnceWith('opaque-fixture', '345678', purpose, userId);
    expect(prisma.whatsappPhone.upsert).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: { userId_phone: { userId, phone } },
      create: { userId, phone, label: 'Work', verifiedAt: linked.verifiedAt, createdById: userId, updatedById: userId },
      update: expect.objectContaining({ deletedAt: null, deletedById: null, restoredById: userId, label: 'Work' }),
    }));
    expect(linked).toMatchObject({ id: phoneId, label: 'Work', last4: '4567' });
    expect(linked).not.toHaveProperty('phone');
    expect(audit.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      action: 'user.whatsapp_linked', entityType: 'WhatsappPhone', entityId: phoneId, metadata: { last4: '4567', label: 'Work' },
    }));
  });

  it('rechecks a verified target for an intervening link before updating the caller', async () => {
    const { phones, prisma } = fixture();
    prisma.whatsappPhone.findFirst.mockResolvedValueOnce({ userId: 'somebody-else' });
    await expect(phones.verify(userId, 'opaque-fixture', verifyInput, {})).rejects.toThrow(ConflictException);
    expect(prisma.whatsappPhone.upsert).not.toHaveBeenCalled();
  });

  it('restores the archived row when the same user verifies the number again', async () => {
    const { phones, prisma } = fixture();
    const original = { ...phoneRow, deletedAt: new Date('2026-11-19') };
    prisma.whatsappPhone.upsert.mockImplementationOnce(async ({ where, update }) => {
      expect(where).toEqual({ userId_phone: { userId, phone } });
      expect(update).toMatchObject({ deletedAt: null, restoredAt: expect.any(Date), restoredById: userId, label: 'New name' });
      return { ...original, ...update };
    });
    await expect(phones.verify(userId, 'opaque-fixture', { ...verifyInput, label: 'New name' }, {}))
      .resolves.toMatchObject({ id: original.id, label: 'New name', deletedAt: null });
  });

  it('rechecks the password, unlinks the caller and invalidates their outstanding link code', async () => {
    const { phones, auth, prisma, audit, pending, memory } = fixture();
    await phones.unlink(userId, phoneId, password, {});
    expect(auth.assertPassword).toHaveBeenCalledExactlyOnceWith(userId, password);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.verificationCode.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId, purpose, target: phone, consumedAt: null } }));
    expect(prisma.whatsappPhone.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: phoneId, userId, deletedAt: null },
      data: { deletedAt: expect.any(Date), deletedById: userId },
    }));
    expect(pending.take).toHaveBeenCalledExactlyOnceWith(phone);
    expect(memory.reset).toHaveBeenCalledExactlyOnceWith(phone);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'user.whatsapp_unlinked', entityId: phoneId, metadata: { phoneId, last4: '4567', label: 'Work' },
    }));
  });

  it('returns 404 for another account’s phone', async () => {
    const { phones, prisma, audit } = fixture();
    const { Prisma } = await import('../../generated/prisma/client.js');
    prisma.whatsappPhone.update.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('No matching record', { code: 'P2025', clientVersion: 'test' }));
    await expect(phones.unlink(userId, phoneId, password, {})).rejects.toThrow(NotFoundException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('audits a rename against the phone and leaves the link event’s label intact', async () => {
    const { phones, prisma, audit } = fixture();
    await phones.verify(userId, 'opaque-fixture', verifyInput, {});
    prisma.whatsappPhone.findFirst.mockResolvedValueOnce(phoneRow);
    await expect(phones.rename(userId, phoneId, 'Personal', {})).resolves.toMatchObject({ id: phoneId, label: 'Personal' });
    expect(audit.record.mock.calls.map(([event]) => [event.action, event.metadata.label])).toEqual([
      ['user.whatsapp_linked', 'Work'], ['user.whatsapp_phone_renamed', 'Personal'],
    ]);
  });

  it('scopes the challenge to an httpOnly link cookie and puts only the expiry in the response', async () => {
    const { phones, settings, setupMeta } = fixture();
    await setupMeta();
    const tokens = new TokenService({} as never, {} as never, { auth: { cookieSecure: true } } as never, {} as never);
    const controller = new WhatsappSettingsController(settings, phones, tokens, new WhatsappConnectionsService(settings), new WhatsappHistoryService({} as never, {} as never));
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const req = { headers: {}, cookies: { tj_whatsapp_link: 'opaque-fixture' } };
    const response = await controller.sendCode(userId, input, req as never, res as never);
    expect(response).toEqual({ expiresInSeconds: expect.any(Number) });
    expect(res.cookie).toHaveBeenCalledExactlyOnceWith('tj_whatsapp_link', 'opaque-fixture', expect.objectContaining({
      httpOnly: true, secure: true, path: '/api/settings/whatsapp/phone',
    }));
    await controller.verify(userId, verifyInput, req as never, res as never);
    expect(res.clearCookie).toHaveBeenCalledExactlyOnceWith('tj_whatsapp_link', expect.objectContaining({
      httpOnly: true, path: '/api/settings/whatsapp/phone',
    }));
  });
});

describe('WhatsApp settings access', () => {
  it.each(['view', 'update', 'reveal', 'setAssistant', 'sendCode', 'verify', 'unlink', 'rename', 'phones', 'history', 'testOpenAi', 'testMeta'] as const)(
    'restricts %s to the stored Super Admin role', (method) => {
    const guard = new AccessGuard(new Reflector());
    const context = (role: UserRole) => ({
      getHandler: () => WhatsappSettingsController.prototype[method],
      getClass: () => WhatsappSettingsController,
      switchToHttp: () => ({ getRequest: () => ({ user: {
        role,
        access: Object.fromEntries(Object.values(Module).map((module) => [
          module, { reach: Reach.ALL, actions: Object.values(Action) },
        ])),
      } }) }),
    }) as never;
    expect(() => guard.canActivate(context(UserRole.ADMIN))).toThrow(ForbiddenException);
    expect(guard.canActivate(context(UserRole.SUPER_ADMIN))).toBe(true);
    },
  );
});

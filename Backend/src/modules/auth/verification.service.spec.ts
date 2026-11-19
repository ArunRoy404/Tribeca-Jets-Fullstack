import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { VerificationPurpose } from '../../generated/prisma/enums.js';
import { VerificationService } from './verification.service.js';

const userId = 'owner-id';
const target = '15551234567';
const { PASSWORD_RESET, TWO_FACTOR, WHATSAPP_LINK } = VerificationPurpose;

function fixture() {
  const code = {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    update: vi.fn().mockResolvedValue({}),
    create: vi.fn(),
    findUnique: vi.fn(),
  };
  const verification = new VerificationService(
    { verificationCode: code, $transaction: vi.fn() } as never,
    { verification: { twoFactorTtlMinutes: 7, passwordResetTtlMinutes: 20, passwordResetWindowMinutes: 5 } } as never,
    { read: vi.fn().mockResolvedValue({ codeAttemptLimit: 3 }) } as never,
  );
  return { code, verification };
}

describe('VerificationService', () => {
  it('stores only a hash for the code and round-trips its target and two-factor expiry', async () => {
    const { code, verification } = fixture();
    const before = Date.now();
    const issued = await verification.issue(userId, WHATSAPP_LINK, { target });
    const data = code.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      target, userId, purpose: WHATSAPP_LINK,
      codeHash: createHash('sha256').update(issued.code).digest('hex'),
      challengeHash: createHash('sha256').update(issued.challengeToken).digest('hex'),
    });
    expect(data).not.toHaveProperty('code');
    expect(data).not.toHaveProperty('challengeToken');
    expect(issued.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7 * 60_000);
    expect(issued.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 7 * 60_000);

    code.findUnique.mockResolvedValue({
      ...data, id: 'link-code', user: { id: userId, deletedAt: null }, attempts: 0,
    });
    await expect(verification.verify(issued.challengeToken, issued.code, WHATSAPP_LINK, userId)).resolves.toMatchObject({ userId, target });
    expect(code.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'link-code', consumedAt: null, expiresAt: { gte: expect.any(Date) }, attempts: { lt: 3 } },
      data: { consumedAt: expect.any(Date) },
    });
    code.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(verification.verify(issued.challengeToken, issued.code, WHATSAPP_LINK, userId)).rejects.toThrow(/expired/);
  });

  it('counts a wrong code, rejects expired links and refuses another user’s challenge', async () => {
    const { code, verification } = fixture();
    const issued = await verification.issue(userId, WHATSAPP_LINK, { target });
    const data = code.create.mock.calls[0][0].data;
    const record = { ...data, id: 'link-code', user: { id: userId, deletedAt: null }, attempts: 0 };
    code.findUnique.mockResolvedValue(record);
    const wrong = issued.code === '123456' ? '654321' : '123456';
    await expect(verification.verify(issued.challengeToken, wrong, WHATSAPP_LINK, userId)).rejects.toThrow(/Incorrect code/);
    expect(code.update).toHaveBeenCalledExactlyOnceWith({ where: { id: 'link-code' }, data: { attempts: 1 } });
    await expect(verification.verify(issued.challengeToken, issued.code, WHATSAPP_LINK, 'other-user')).rejects.toThrow(BadRequestException);
    code.findUnique.mockResolvedValue({ ...record, expiresAt: new Date(0) });
    await expect(verification.verify(issued.challengeToken, issued.code, WHATSAPP_LINK, userId)).rejects.toThrow(/expired/);
    expect(code.update).toHaveBeenCalledOnce();
  });

  it.each([PASSWORD_RESET, TWO_FACTOR])('keeps the existing %s verification flow', async (purpose) => {
    const { code, verification } = fixture();
    const issued = await verification.issue(userId, purpose);
    const data = code.create.mock.calls[0][0].data;
    expect(data.target).toBeNull();
    code.findUnique.mockResolvedValue({
      ...data, id: 'auth-code', user: { id: userId, deletedAt: null }, attempts: 0,
    });
    await verification.verify(issued.challengeToken, issued.code, purpose);
    const changes = code.update.mock.calls[0][0].data;
    if (purpose === PASSWORD_RESET) {
      expect(changes).toEqual({ verifiedAt: expect.any(Date), expiresAt: expect.any(Date) });
      expect(changes).not.toHaveProperty('consumedAt');
    } else {
      expect(changes).toEqual({ consumedAt: expect.any(Date) });
    }
  });
});

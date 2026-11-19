import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { AuthService } from './auth.service.js';
import { updateProfileSchema } from './dto/account.dto.js';

describe('My Account time zone', () => {
  it('accepts a named zone or null to follow the company', () => {
    expect(updateProfileSchema.parse({ timeZone: ' Europe/London ' })).toEqual({ timeZone: 'Europe/London' });
    expect(updateProfileSchema.parse({ timeZone: null })).toEqual({ timeZone: null });
  });

  it.each(['Mars/Olympus', '+06:00'])('refuses %s', (timeZone) => {
    expect(updateProfileSchema.safeParse({ timeZone }).success).toBe(false);
  });

  it('selects the caller’s time zone with their profile', async () => {
    const findFirstOrThrow = vi.fn().mockResolvedValue({
      id: 'user-id', role: UserRole.BROKER, permissions: null, timeZone: 'Europe/London',
    });
    const auth = new AuthService(
      { user: { findFirstOrThrow } } as never, {} as never, {} as never,
      {} as never, {} as never, {} as never, {} as never,
    );
    expect(await auth.getProfile('user-id')).toMatchObject({ timeZone: 'Europe/London' });
    expect(findFirstOrThrow).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'user-id', deletedAt: null },
      select: expect.objectContaining({ timeZone: true }),
    });
  });
});

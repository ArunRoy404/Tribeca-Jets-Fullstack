import { describe, expect, it } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { queryUsersSchema } from './dto/user.dto.js';

describe('GET /users ?role= (10 Nov 2026)', () => {
  it('takes one role, as it always did', () => {
    expect(queryUsersSchema.parse({ role: 'BROKER' }).role).toEqual([UserRole.BROKER]);
  });

  it('takes several, comma-separated — the broker pickers\' set', () => {
    expect(queryUsersSchema.parse({ role: 'BROKER, ADMIN,SUPER_ADMIN' }).role).toEqual([
      UserRole.BROKER,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ]);
  });

  it('refuses a role that does not exist, and an empty list', () => {
    expect(queryUsersSchema.safeParse({ role: 'BROKER,CAPTAIN' }).success).toBe(false);
    expect(queryUsersSchema.safeParse({ role: ',' }).success).toBe(false);
  });

  it('is absent when not asked', () => {
    expect(queryUsersSchema.parse({}).role).toBeUndefined();
  });
});

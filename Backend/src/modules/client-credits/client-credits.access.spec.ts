import { describe, expect, it } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { Action, Module, Reach } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { ClientCreditsController } from './client-credits.controller.js';
import { ClientCreditsService } from './client-credits.service.js';
import { STAFF_ONLY_KEY } from '../../common/constants/auth.constants.js';

function makeUser(
  role: UserRole,
  grants?: Partial<Record<Module, Action[]>>,
  reach: Reach = Reach.ALL,
): AuthenticatedUser {
  const access: AuthenticatedUser['access'] = {};
  if (grants) {
    for (const [mod, actions] of Object.entries(grants)) {
      access[mod as Module] = { reach, actions };
    }
  }
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@tribecajets.com`,
    role,
    access,
  };
}

describe('ClientCredits Access', () => {
  it('decorates ClientCreditsController with @StaffOnly()', () => {
    const isStaffOnly = Reflect.getMetadata(
      STAFF_ONLY_KEY,
      ClientCreditsController,
    );
    expect(isStaffOnly).toBe(true);
  });

  describe('ClientCreditsService Capability Checks', () => {
    const mockPrisma = {} as any;
    const mockAudit = {} as any;
    const mockClients = {
      subjectRef: (user: AuthenticatedUser, id: string) => {
        if (id === 'forbidden-client') {
          throw new Error('Not Found');
        }
        return Promise.resolve({ id, label: 'Client Corp', archived: false });
      },
    } as any;
    const mockTrips = {} as any;

    const service = new ClientCreditsService(
      mockPrisma,
      mockAudit,
      mockClients,
      mockTrips,
    );

    it('refuses assistant from reading client credit (assistant has no financial access)', async () => {
      const assistant = makeUser(UserRole.ASSISTANT, {
        [Module.CLIENTS]: [Action.VIEW, Action.EDIT],
      });
      await expect(
        (service as any).client(assistant, 'client-1'),
      ).rejects.toThrow('Your role cannot see what a client has on account');
    });

    it('refuses assistant from recording client credit movements', () => {
      const assistant = makeUser(UserRole.ASSISTANT, {
        [Module.CLIENTS]: [Action.VIEW, Action.EDIT],
      });
      expect(() => (service as any).assertMayWrite(assistant)).toThrow(
        "Your role cannot change a client's money on account",
      );
    });

    it('allows broker with CLIENTS VIEW & EDIT to access and manage client credit', async () => {
      const broker = makeUser(
        UserRole.BROKER,
        {
          [Module.CLIENTS]: [Action.VIEW, Action.EDIT],
        },
        Reach.ASSIGNED,
      );
      const ref = await (service as any).client(broker, 'client-1');
      expect(ref.id).toBe('client-1');
      expect(() => (service as any).assertMayWrite(broker)).not.toThrow();
    });

    it('allows admin with full access to view and manage client credit', async () => {
      const admin = makeUser(
        UserRole.ADMIN,
        {
          [Module.CLIENTS]: [Action.VIEW, Action.EDIT, Action.ARCHIVE],
        },
        Reach.ALL,
      );
      const ref = await (service as any).client(admin, 'client-1');
      expect(ref.id).toBe('client-1');
      expect(() => (service as any).assertMayWrite(admin)).not.toThrow();
    });
  });
});

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
      ).rejects.toMatchObject({ status: 403, message: 'Your permissions do not allow seeing money on account' });
    });

    it('refuses assistant from recording client credit movements', () => {
      const assistant = makeUser(UserRole.ASSISTANT, {
        [Module.CLIENTS]: [Action.VIEW, Action.EDIT],
      });
      expect(() => (service as any).assertMayWrite(assistant)).toThrow(
        "Your permissions do not allow changing a client's money on account",
      );
    });

    it('allows broker with CLIENTS VIEW & EDIT to access and manage client credit', async () => {
      const broker = makeUser(
        UserRole.BROKER,
        {
          [Module.CLIENTS]: [Action.VIEW, Action.EDIT, Action.VIEW_MONEY],
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
          [Module.CLIENTS]: [Action.VIEW, Action.EDIT, Action.ARCHIVE, Action.VIEW_MONEY],
        },
        Reach.ALL,
      );
      const ref = await (service as any).client(admin, 'client-1');
      expect(ref.id).toBe('client-1');
      expect(() => (service as any).assertMayWrite(admin)).not.toThrow();
    });

    it('lets an assistant with the grant read and checks Edit independently', async () => {
      const read = makeUser(UserRole.ASSISTANT, { [Module.CLIENTS]: [Action.VIEW, Action.VIEW_MONEY] });
      const write = makeUser(UserRole.ASSISTANT, { [Module.CLIENTS]: [Action.VIEW, Action.EDIT, Action.VIEW_MONEY] });
      await expect((service as any).client(read, 'client-1')).resolves.toMatchObject({ id: 'client-1' });
      expect(() => (service as any).assertMayWrite(read)).toThrow();
      expect(() => (service as any).assertMayWrite(write)).not.toThrow();
    });

    it('refuses a broker whose stored grant omits View money', async () => {
      const broker = makeUser(UserRole.BROKER, { [Module.CLIENTS]: [Action.VIEW, Action.EDIT] });
      await expect((service as any).client(broker, 'client-1')).rejects.toMatchObject({ status: 403 });
    });
  });
});

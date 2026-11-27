import { describe, expect, it, vi } from 'vitest';
import { Action, Module, Reach } from '../../common/authorization/access.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { DashboardService } from './dashboard.service.js';

describe('dashboard uninvoiced visibility', () => {
  it.each([true, false])('reads and returns uninvoiced only with the outstanding AR permission: %s', async (mayRead) => {
    const user: AuthenticatedUser = { id: 'broker', email: 'broker@example.com', role: UserRole.BROKER,
      access: mayRead ? { [Module.RECEIVABLES]: { reach: Reach.OWN, actions: [Action.VIEW] } } : {} };
    const trips = { periodFigures: vi.fn().mockResolvedValue({ revenue: 0, fet: 0, tripCount: 0, pricedCount: 0 }) };
    const receivables = {
      stats: vi.fn().mockResolvedValue({ outstanding: 100, counts: { DUE: 1, PARTIALLY_PAID: 0, OVERDUE: 0 } }),
      uninvoiced: vi.fn().mockResolvedValue(250),
    };
    const service = new DashboardService({} as never, trips as never, {} as never, receivables as never,
      {} as never, {} as never, {} as never, {} as never, {} as never);
    const summary = await service.summary(user, { period: 'WEEK', on: new Date('2026-11-27T00:00:00Z') });
    if (mayRead) {
      expect(summary.receivables).toMatchObject({ outstanding: 100, uninvoiced: 250 });
      expect(receivables.uninvoiced).toHaveBeenCalledWith(user);
    } else {
      expect(summary.receivables).toBeUndefined();
      expect(receivables.uninvoiced).not.toHaveBeenCalled();
    }
  });
});

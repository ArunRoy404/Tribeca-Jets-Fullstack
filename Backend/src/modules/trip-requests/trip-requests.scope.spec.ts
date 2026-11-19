import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { queryTripRequestsSchema } from './dto/trip-request.dto.js';
import { TripRequestsService } from './trip-requests.service.js';

/**
 * A search must only narrow what the caller may already see. Visibility and
 * search were both spread as `OR`, so the search replaced the visibility and
 * a broker limited to their own requests saw every request once they searched.
 */
function serviceCapturingWhere() {
  const where: unknown[] = [];
  const tripRequest = {
    findMany: vi.fn((args: { where: unknown }) => { where.push(args.where); return 'findMany'; }),
    count: vi.fn(() => 'count'),
  };
  const prisma = { tripRequest, $transaction: vi.fn(async () => [[], 0]) };
  const sourcing = { summaryFor: vi.fn(async () => new Map()) };
  const service = new TripRequestsService(prisma as never, {} as never, sourcing as never, {} as never);
  return { service, where };
}

const broker: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'broker@example.com',
  role: UserRole.BROKER,
  access: resolveAccess(UserRole.BROKER, null),
};
const visibility = { OR: [{ assignedBrokerId: broker.id }, { assignedBrokerId: null }] };
const clientId = '22222222-2222-4222-8222-222222222222';

describe('trip requests list scope', () => {
  it('keeps a limited broker\'s visibility when they search', async () => {
    const { service, where } = serviceCapturingWhere();
    await service.findAll(broker, queryTripRequestsSchema.parse({ search: 'KTEB' }));

    const clause = where[0] as { AND: { OR?: unknown[] }[]; OR?: unknown };
    expect(clause.OR).toBeUndefined();
    expect(clause.AND[0]).toEqual(visibility);
    expect(clause.AND[1]?.OR?.length).toBeGreaterThan(0);
  });

  it.each(['TR-1042', 'tr1042', '1042'])('searches by %s within the broker\'s visibility', async (search) => {
    const { service, where } = serviceCapturingWhere();
    await service.findAll(broker, queryTripRequestsSchema.parse({ search }));

    const clause = where[0] as { AND: { OR?: unknown[] }[] };
    expect(clause.AND[0]).toEqual(visibility);
    expect(clause.AND[1]?.OR).toContainEqual({ reference: 1042 });
  });

  it('keeps visibility, search and the client list together', async () => {
    const { service, where } = serviceCapturingWhere();
    await service.findAll(broker, queryTripRequestsSchema.parse({ search: 'KTEB', clientIds: clientId }));

    const clause = where[0] as { AND: unknown[] };
    expect(clause.AND).toHaveLength(3);
    expect(clause.AND[0]).toEqual(visibility);
    expect(clause.AND[2]).toEqual({ clientId: { in: [clientId] } });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { queryQuotesSchema } from './dto/quote.dto.js';
import { QuotesService } from './quotes.service.js';

/**
 * A search must only narrow what the caller may already see. Visibility and
 * search were both spread as `OR`, so the search replaced the visibility and
 * a broker limited to their own quotes saw every quote once they searched.
 */
function serviceCapturingWhere() {
  const where: unknown[] = [];
  const quote = {
    findMany: vi.fn((args: { where: unknown }) => { where.push(args.where); return 'findMany'; }),
    count: vi.fn(() => 'count'),
  };
  const prisma = { quote, $transaction: vi.fn(async () => [[], 0]) };
  const service = new QuotesService(prisma as never, {} as never, {} as never, {} as never);
  return { service, where };
}

const broker: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'broker@example.com',
  role: UserRole.BROKER,
  access: resolveAccess(UserRole.BROKER, null),
};

describe('quotes list scope', () => {
  it('keeps a limited broker\'s visibility when they search', async () => {
    const { service, where } = serviceCapturingWhere();
    await service.findAll(broker, queryQuotesSchema.parse({ search: 'KTEB' }));

    const clause = where[0] as { AND: { OR?: unknown[] }[]; OR?: unknown };
    expect(clause.OR).toBeUndefined();
    expect(clause.AND[0]).toEqual({ OR: [{ assignedBrokerId: broker.id }, { assignedBrokerId: null }] });
    expect(clause.AND[1].OR?.length).toBeGreaterThan(0);
  });

  it('keeps the visibility with no search at all', async () => {
    const { service, where } = serviceCapturingWhere();
    await service.findAll(broker, queryQuotesSchema.parse({}));

    const clause = where[0] as { AND: unknown[] };
    expect(clause.AND).toEqual([{ OR: [{ assignedBrokerId: broker.id }, { assignedBrokerId: null }] }, {}]);
  });

  it('joins full-name search with the original visibility clause', async () => {
    const { service, where } = serviceCapturingWhere();
    await service.findAll(broker, queryQuotesSchema.parse({ search: 'Elena Rostova' }));
    const clause = where[0] as { AND: { OR?: unknown[] }[] };
    expect(clause.AND[0]).toEqual({ OR: [{ assignedBrokerId: broker.id }, { assignedBrokerId: null }] });
    expect(clause.AND[1]?.OR).toContainEqual({
      AND: ['Elena', 'Rostova'].map((contains) => ({
        OR: ['firstName', 'lastName'].map((field) => ({ client: { [field]: { contains, mode: 'insensitive' } } })),
      })),
    });
  });

  it.each(['Q-1042', 'q1042', '1042'])('searches by %s within the broker\'s visibility', async (search) => {
    const { service, where } = serviceCapturingWhere();
    await service.findAll(broker, queryQuotesSchema.parse({ search }));

    const clause = where[0] as { AND: { OR?: unknown[] }[]; OR?: unknown };
    expect(clause.OR).toBeUndefined();
    expect(clause.AND[0]).toEqual({ OR: [{ assignedBrokerId: broker.id }, { assignedBrokerId: null }] });
    expect(clause.AND[1]?.OR).toContainEqual({ reference: 1042 });
  });
});

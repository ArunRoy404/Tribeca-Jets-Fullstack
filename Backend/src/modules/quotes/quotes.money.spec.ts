import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import { QuoteStatus, UserRole } from '../../generated/prisma/enums.js';
import { createQuoteSchema, suggestPriceSchema, updateQuoteSchema } from './dto/quote.dto.js';
import { QuotesService } from './quotes.service.js';
import { depositWithinTotal } from './quotes.pricing.js';

const user = { id: 'broker', email: 'broker@example.com', role: UserRole.BROKER, access: resolveAccess(UserRole.BROKER, null) };
const clientId = '11111111-1111-4111-8111-111111111111';
const settingsRow = { applyFetByDefault: false, defaultFetPercent: 8, defaultMarkupPercent: 18, quoteValidityHours: 48, defaultQuoteTerms: 'Company terms' };

function setup(depositAmount: number | null = null) {
  const row = { id: 'quote', reference: 42, version: 1, status: QuoteStatus.DRAFT, clientId,
    basePrice: 10000, fetEnabled: true, fetRate: 0.08, operatorCost: 8000,
    depositAmount, validUntil: null, lineItems: [] };
  const quote = {
    findFirst: vi.fn().mockResolvedValue(row),
    create: vi.fn(async ({ data }) => ({ ...row, ...data })),
    update: vi.fn(async ({ data }) => ({ ...row, ...data })),
  };
  const tx = { quote, quoteVersion: { create: vi.fn() } };
  const prisma = { ...tx, client: { findUnique: vi.fn().mockResolvedValue({ deletedAt: null }) },
    $transaction: vi.fn(async (run) => run(tx)) };
  const settings = { read: vi.fn().mockResolvedValue(settingsRow) };
  const service = new QuotesService(prisma as never, { record: vi.fn() } as never, {} as never, settings as never, {} as never);
  return { service, quote, settings };
}

describe('quote defaults at the service boundary', () => {
  it('stores Settings defaults and a marked-up base on cost-only create', async () => {
    const { service, quote } = setup();
    await service.create(user, createQuoteSchema.parse({ clientId, operatorCost: 1000 }));
    expect(quote.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      basePrice: 1180, fetRate: 0.08, fetEnabled: false, terms: 'Company terms',
    }) }));
  });

  it('uses Settings in preview and in a suggestion without markupRates', async () => {
    const { service } = setup();
    const preview = await service.pricePreview(user, { basePrice: 1000, fetEnabled: true });
    expect(preview).toMatchObject({ fetRate: 0.08, fetAmount: 80, totalPrice: 1080 });
    const suggestion = await service.suggestPrice(suggestPriceSchema.parse({ operatorCost: 1000 }));
    expect(suggestion.suggestions).toHaveLength(1);
    expect(suggestion.suggestions[0]).toMatchObject({ markupRate: 0.18, basePrice: 1180, fetAmount: 0 });
  });

  it('does not read or apply defaults on an update', async () => {
    const { service, settings, quote } = setup();
    await service.update(user, 'quote', updateQuoteSchema.parse({ internalNotes: 'Call' }));
    expect(settings.read).not.toHaveBeenCalled();
    expect(quote.update.mock.calls[0]?.[0]?.data).not.toHaveProperty('fetRate');
  });
});

describe('deposit ceiling', () => {
  it('accepts equal, refuses one cent over, and treats an absent deposit as absent', () => {
    expect(depositWithinTotal(12345, 12345)).toBe(true);
    expect(depositWithinTotal(12345.01, 12345)).toBe(false);
    expect(depositWithinTotal(null, 12345)).toBe(true);
  });

  it('accepts a deposit equal to the complete total on create', async () => {
    const { service } = setup();
    await expect(service.create(user, createQuoteSchema.parse({ clientId, basePrice: 10000,
      fetEnabled: true, fetRate: 0.08, depositAmount: 10800 }))).resolves.toMatchObject({ depositAmount: 10800 });
  });

  it('refuses one cent over on create with a formatted maximum on the field', async () => {
    const { service, quote } = setup();
    await expect(service.create(user, createQuoteSchema.parse({ clientId, basePrice: 10000,
      fetEnabled: true, fetRate: 0.08, depositAmount: 10800.01 }))).rejects.toMatchObject({ status: 400,
      response: { errors: { depositAmount: "The deposit can't be more than the quote total of $10,800.00" } } });
    expect(quote.create).not.toHaveBeenCalled();
  });

  it('refuses an update lowering the price below the deposit already stored', async () => {
    const { service, quote } = setup(9000);
    await expect(service.update(user, 'quote', { basePrice: 1000 })).rejects.toMatchObject({ status: 400,
      response: { errors: { depositAmount: "The deposit can't be more than the quote total of $1,080.00" } } });
    expect(quote.update).not.toHaveBeenCalled();
  });

  it('checks edited tax and extras and permits clearing the deposit with the price edit', async () => {
    const { service } = setup(10800);
    await expect(service.update(user, 'quote', { fetEnabled: false })).rejects.toMatchObject({ status: 400 });
    await expect(service.update(user, 'quote', { basePrice: 1000, depositAmount: null })).resolves.toMatchObject({ depositAmount: null });
    await expect(service.update(user, 'quote', { depositAmount: 11000, lineItems: [{ label: 'Catering', amount: 200, included: false }] })).resolves.toMatchObject({ depositAmount: 11000 });
  });
});

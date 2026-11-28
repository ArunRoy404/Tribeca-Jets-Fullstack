import { describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '../../common/authorization/access.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { createQuoteSchema, updateQuoteSchema, queryQuotesSchema } from './dto/quote.dto.js';
import { QuotesService } from './quotes.service.js';
import { ItinerariesService } from '../itineraries/itineraries.service.js';

const user = { id: 'owner', email: 'owner@example.com', role: UserRole.ADMIN, access: resolveAccess(UserRole.ADMIN, null) };
const clientId = '11111111-1111-4111-8111-111111111111';
const photo = '/api/uploads/22222222-2222-4222-8222-222222222222';

describe('B4 quote photos', () => {
  it('accepts relative uploads on both DTOs and refuses absolute URLs', () => {
    expect(createQuoteSchema.parse({ clientId, basePrice: 1000, interiorImageUrl: photo }).interiorImageUrl).toBe(photo);
    expect(updateQuoteSchema.parse({ interiorImageUrl: photo }).interiorImageUrl).toBe(photo);
    expect(updateQuoteSchema.parse({ interiorImageUrl: null }).interiorImageUrl).toBeNull();
    expect(createQuoteSchema.safeParse({ clientId, basePrice: 1000, interiorImageUrl: null }).success).toBe(false);
    for (const interiorImageUrl of ['https://example.com/cabin.jpg', 'http://localhost:4000' + photo]) {
      expect(createQuoteSchema.safeParse({ clientId, basePrice: 1000, interiorImageUrl }).success).toBe(false);
      expect(updateQuoteSchema.safeParse({ interiorImageUrl }).success).toBe(false);
    }
  });

  it('round-trips the photo on writes and selects it on list and detail reads', async () => {
    const stored = { id: 'quote', reference: 42, clientId, status: 'DRAFT', version: 1, basePrice: 1000,
      fetEnabled: false, fetRate: 0, operatorCost: null, lineItems: [], depositAmount: null, interiorImageUrl: null };
    const quote = {
      create: vi.fn(async ({ data }) => Object.assign(stored, data)),
      update: vi.fn(async ({ data }) => Object.assign(stored, data)),
      findFirst: vi.fn().mockImplementation(async () => stored),
      findMany: vi.fn().mockImplementation(async () => [stored]), count: vi.fn(async () => 1),
    };
    const tx = { quote, quoteVersion: { create: vi.fn() } };
    const prisma = { ...tx, client: { findUnique: vi.fn().mockResolvedValue({ deletedAt: null }) },
      $transaction: vi.fn(async (run) => typeof run === 'function' ? run(tx) : Promise.all(run)) };
    const settings = { read: vi.fn().mockResolvedValue({ applyFetByDefault: false, defaultFetPercent: 7.5, quoteValidityHours: 24 }) };
    const service = new QuotesService(prisma as never, { record: vi.fn() } as never, {} as never, settings as never, {} as never);
    expect(await service.create(user, createQuoteSchema.parse({ clientId, basePrice: 1000, interiorImageUrl: photo }))).toMatchObject({ interiorImageUrl: photo });
    expect(quote.create.mock.calls[0]?.[0]?.select.interiorImageUrl).toBe(true);
    expect(await service.findOne(user, 'quote')).toMatchObject({ interiorImageUrl: photo });
    expect(quote.findFirst.mock.calls.at(-1)?.[0]?.select.interiorImageUrl).toBe(true);
    expect((await service.findAll(user, queryQuotesSchema.parse({}))).items[0]).toMatchObject({ interiorImageUrl: photo });
    expect(quote.findMany.mock.calls[0]?.[0]?.select.interiorImageUrl).toBe(true);
    expect(await service.update(user, 'quote', updateQuoteSchema.parse({ interiorImageUrl: null }))).toMatchObject({ interiorImageUrl: null });
    expect(quote.update.mock.calls[0]?.[0]?.select.interiorImageUrl).toBe(true);
  });
});

describe('B4 itinerary photo inheritance through Trip.quoteId', () => {
  it.each([
    [{ exteriorImageUrl: 'override-ext', interiorImageUrl: 'override-int' }, { exteriorImageUrl: 'quote-ext', interiorImageUrl: 'quote-int' }, 'override-ext', 'override-int'],
    [{ exteriorImageUrl: null, interiorImageUrl: null }, { exteriorImageUrl: 'quote-ext', interiorImageUrl: 'quote-int' }, 'quote-ext', 'quote-int'],
    [{ exteriorImageUrl: null, interiorImageUrl: null }, { exteriorImageUrl: null, interiorImageUrl: null }, 'fleet-ext', 'fleet-int'],
    [{ exteriorImageUrl: null, interiorImageUrl: null }, null, 'fleet-ext', 'fleet-int'],
  ])('uses override, then quote, then fleet: %j', async (overrides, quote, exterior, interior) => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'itinerary', status: 'DRAFT', ...overrides,
      trip: { id: 'trip', reference: 42, quote, aircraft: { exteriorImageUrl: 'fleet-ext', interiorImageUrl: 'fleet-int' }, legs: [], passengers: [], deletedAt: null } });
    const service = new ItinerariesService({ itinerary: { findFirst } } as never, {} as never, {} as never, {} as never, {} as never);
    const result = await service.findOne(user, 'itinerary');
    expect(result).toMatchObject({ exteriorImageUrl: exterior, interiorImageUrl: interior });
    expect(findFirst.mock.calls[0]?.[0]?.select.trip.select.quote.select).toEqual({ exteriorImageUrl: true, interiorImageUrl: true });
    expect(findFirst.mock.calls[0]?.[0]?.select.trip.select.passengers.select).not.toHaveProperty('weightLb');
  });
});

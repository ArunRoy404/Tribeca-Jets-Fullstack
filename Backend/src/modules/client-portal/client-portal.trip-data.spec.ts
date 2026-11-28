import { describe, expect, it, vi } from 'vitest';
import { ClientPortalService } from './client-portal.service.js';
import { signClientPortalToken } from './client-portal.token.js';
import { renderItineraryPdf, renderQuotePdf } from '../../common/pdf/pdf.templates.js';

vi.mock('../../common/pdf/pdf.templates.js', () => ({
  renderItineraryPdf: vi.fn(async () => Buffer.from('pdf')),
  renderQuotePdf: vi.fn(async () => Buffer.from('pdf')),
  renderInvoicePdf: vi.fn(async () => Buffer.from('pdf')),
}));

const secret = 'test-secret-for-trip-data';
const { token } = signClientPortalToken('client', secret);
const forbidden = ['weightLb', 'luggageCount', 'luggageWeightLb'];
function hasNoOperatorData(value: unknown) {
  const json = JSON.stringify(value);
  for (const field of forbidden) expect(json).not.toContain(`"${field}"`);
}

function setup() {
  const itinerary = { id: 'itinerary', status: 'DRAFT', deletedAt: null, luggageCount: 3, luggageWeightLb: 120 };
  const trip = { id: 'trip', reference: 42, status: 'BOOKED', legs: [], passengers: [{ fullName: 'Ada' }],
    luggageCount: 3, luggageWeightLb: 120, aircraft: null, itinerary,
    quote: { exteriorImageUrl: '/api/uploads/quote-ext', interiorImageUrl: '/api/uploads/quote-int' } };
  const prisma = {
    client: { findFirst: vi.fn().mockResolvedValue({ id: 'client', firstName: 'Ada', lastName: 'Ward', type: 'DIRECT' }) },
    quote: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: 'quote', reference: 1, status: 'SENT', version: 1,
      basePrice: 1000, fetEnabled: false, fetRate: 0, lineItems: [], interiorImageUrl: '/api/uploads/quote-int', exteriorImageUrl: null,
      aircraft: { exteriorImageUrl: '/api/uploads/fleet-ext', interiorImageUrl: '/api/uploads/fleet-int' } }) },
    trip: { findMany: vi.fn().mockResolvedValue([trip]) },
    invoice: { findMany: vi.fn().mockResolvedValue([]) },
    clientCredit: { findMany: vi.fn().mockResolvedValue([]) },
    document: { findMany: vi.fn().mockResolvedValue([]) },
    itinerary: { findFirst: vi.fn().mockResolvedValue({ ...itinerary, exteriorImageUrl: null, interiorImageUrl: null, trip }) },
  };
  const settings = { documentBranding: vi.fn().mockResolvedValue({}), readUploadRaster: vi.fn().mockResolvedValue(null) };
  const service = new ClientPortalService(prisma as never, {} as never, { auth: { accessSecret: secret } } as never, {} as never, settings as never, {} as never);
  return { prisma, service, settings };
}

describe('B4 client portal boundary', () => {
  it('returns trip and itinerary payloads without weight/luggage and never selects those fields', async () => {
    const { prisma, service } = setup();
    const overview = await service.overview(token);
    hasNoOperatorData(overview);
    hasNoOperatorData(prisma.trip.findMany.mock.calls[0]?.[0]?.select);
    hasNoOperatorData(prisma.quote.findMany.mock.calls[0]?.[0]?.select);
    await service.itineraryPdf(token, 'itinerary');
    hasNoOperatorData(prisma.itinerary.findFirst.mock.calls[0]?.[0]?.select);
    hasNoOperatorData(vi.mocked(renderItineraryPdf).mock.calls.at(-1)?.[0]);
  });

  it('the client itinerary PDF reads quote photos between its override and fleet fallback', async () => {
    const { service, settings } = setup();
    await service.itineraryPdf(token, 'itinerary');
    expect(settings.readUploadRaster.mock.calls).toEqual([['/api/uploads/quote-ext'], ['/api/uploads/quote-int']]);
  });

  it('the client quote PDF reads its interior override as well as the exterior fallback', async () => {
    const { service, settings, prisma } = setup();
    await service.quotePdf(token, 'quote');
    expect(settings.readUploadRaster.mock.calls).toEqual([['/api/uploads/fleet-ext'], ['/api/uploads/quote-int']]);
    hasNoOperatorData(prisma.quote.findFirst.mock.calls[0]?.[0]?.select);
    hasNoOperatorData(vi.mocked(renderQuotePdf).mock.calls.at(-1)?.[0]);
  });
});

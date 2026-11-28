import { describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { QuotesService } from './quotes.service.js';
import { ClientsService } from '../clients/clients.service.js';
import { TripsService } from '../trips/trips.service.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { AirportsService } from '../airports/airports.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { MailService } from '../../core/mail/mail.service.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';
import { OperatorQuotesService } from '../operator-quotes/operator-quotes.service.js';

describe('quote send delegates the client consequence', () => {
  it('calls ClientsService within the quote update transaction', async () => {
    const current = { id: 'quote', reference: 42, version: 1, status: 'DRAFT', clientId: 'client', tripRequestId: null,
      basePrice: 1000, operatorCost: 800, fetEnabled: false, fetRate: 0, lineItems: [], validUntil: null };
    const tx = { quote: { update: vi.fn().mockResolvedValue(current) } };
    const prisma = { quote: { findFirst: vi.fn().mockResolvedValue(current) }, $transaction: vi.fn(async (run) => run(tx)) };
    const clients = { advanceOnQuoteSent: vi.fn() };
    const service = new QuotesService(prisma as never, { record: vi.fn() } as never, {} as never, {} as never, clients as never);
    await service.send({ id: 'owner', access: {} } as never, 'quote', {});
    expect(clients.advanceOnQuoteSent).toHaveBeenCalledWith(tx, 'client', 'owner');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('Nest resolves the existing clients → trips → quotes reader cycle with the new client owner call', async () => {
    const compiled = await Test.createTestingModule({ providers: [ClientsService, TripsService, QuotesService,
      ...[PrismaService, AuditService, AirportsService, SettingsService, MailService, TripRequestsService]
        .map((provide) => ({ provide, useValue: {} })),
    ] }).compile();
    expect(compiled.get(ClientsService)).toBeInstanceOf(ClientsService);
    expect(compiled.get(TripsService)).toBeInstanceOf(TripsService);
    expect(compiled.get(QuotesService)).toBeInstanceOf(QuotesService);
    await compiled.close();
  });

  it('Nest resolves the request → trips conversion reader alongside the client and quote readers', async () => {
    const compiled = await Test.createTestingModule({ providers: [ClientsService, TripsService, QuotesService, TripRequestsService,
      ...[PrismaService, AuditService, AirportsService, SettingsService, MailService, OperatorQuotesService]
        .map((provide) => ({ provide, useValue: {} })),
    ] }).compile();
    expect(compiled.get(TripRequestsService)).toBeInstanceOf(TripRequestsService);
    expect(compiled.get(TripsService)).toBeInstanceOf(TripsService);
    await compiled.close();
  });
});

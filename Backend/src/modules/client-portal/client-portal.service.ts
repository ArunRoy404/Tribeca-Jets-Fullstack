import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { AppConfigService } from '../../config/config.service.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import {
  CreditEntryType,
  InvoiceStatus,
  QuoteStatus,
  TripStatus,
} from '../../generated/prisma/enums.js';
import { ClientsService } from '../clients/clients.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { priceQuote } from '../quotes/quotes.pricing.js';
import { invoiceFigures, invoiceNumber } from '../receivables/receivables.amounts.js';
import { summarise, toCents } from '../client-credits/client-credits.balance.js';
import { SENSITIVE_CATEGORIES } from '../documents/documents.rules.js';
import { PDF_CONTENT_TYPE } from '../../common/pdf/pdf.document.js';
import {
  renderInvoicePdf,
  renderItineraryPdf,
  renderQuotePdf,
} from '../../common/pdf/pdf.templates.js';
import { signClientPortalToken, verifyClientPortalToken } from './client-portal.token.js';
import type { RespondQuotePortalInput } from './dto/client-portal.dto.js';

const AIRPORT_SELECT = {
  select: { id: true, icao: true, iata: true, name: true, city: true, assignedFbo: true },
} as const;

const BROKER_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true, phone: true },
} as const;

@Injectable()
export class ClientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    private readonly clients: ClientsService,
    private readonly settings: SettingsService,
    private readonly uploads: UploadsService,
  ) {}

  private get secret(): string {
    return this.config.auth.accessSecret;
  }

  /**
   * Issues a signed 90-day Client Portal link for a live client in the caller's scope.
   */
  async issueLink(user: AuthenticatedUser, clientId: string) {
    const client = await this.clients.findOne(user, clientId);
    if (client.deletedAt) {
      throw new BadRequestException('Cannot issue a portal link for an archived client.');
    }
    const { token, expiresAt } = signClientPortalToken(client.id, this.secret);
    return {
      clientId: client.id,
      token,
      path: `/client-portal/${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Resolves a portal token to a live `Client` row, or throws 401/404.
   */
  private async resolveClient(token: string) {
    const { cid } = verifyClientPortalToken(token, this.secret);
    const client = await this.prisma.client.findFirst({
      where: { id: cid, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        clientType: true,
        preferredAircraftCategory: true,
        homeAirport: AIRPORT_SELECT,
        assignedBroker: BROKER_SELECT,
      },
    });
    if (!client) {
      throw new NotFoundException('This client record is no longer active.');
    }
    return client;
  }

  /**
   * Full Client Portal snapshot: client profile, dedicated advisor, credit
   * balance, sent/answered quotes (without internal cost/margin), live trips
   * with itineraries, sent invoices, and non-sensitive vault documents.
   */
  async overview(token: string) {
    const client = await this.resolveClient(token);

    const [quotesRaw, tripsRaw, invoicesRaw, creditsRaw, documentsRaw] = await Promise.all([
      this.prisma.quote.findMany({
        where: {
          clientId: client.id,
          deletedAt: null,
          status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.APPROVED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED] },
        },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          reference: true,
          status: true,
          version: true,
          originAirport: AIRPORT_SELECT,
          destinationAirport: AIRPORT_SELECT,
          departureDate: true,
          returnDate: true,
          passengers: true,
          aircraft: {
            select: {
              id: true,
              tailNumber: true,
              model: true,
              category: true,
              maxPassengers: true,
              exteriorImageUrl: true,
            },
          },
          quotedAircraft: true,
          exteriorImageUrl: true,
          basePrice: true,
          fetEnabled: true,
          fetRate: true,
          lineItems: true,
          terms: true,
          validUntil: true,
          sentAt: true,
          decidedAt: true,
          decisionNote: true,
          createdAt: true,
        },
      }),
      this.prisma.trip.findMany({
        where: {
          clientId: client.id,
          deletedAt: null,
          status: { not: TripStatus.CANCELLED },
        },
        orderBy: [{ departureDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          reference: true,
          status: true,
          departureDate: true,
          returnDate: true,
          passengerCount: true,
          aircraftDescription: true,
          aircraft: {
            select: {
              id: true,
              tailNumber: true,
              model: true,
              category: true,
              exteriorImageUrl: true,
              interiorImageUrl: true,
            },
          },
          legs: {
            orderBy: { sequence: 'asc' },
            select: {
              id: true,
              sequence: true,
              originAirport: AIRPORT_SELECT,
              destinationAirport: AIRPORT_SELECT,
              departureDate: true,
              departureTime: true,
              arrivalDate: true,
              arrivalTime: true,
            },
          },
          itinerary: {
            select: {
              id: true,
              status: true,
              confirmed: true,
              sentAt: true,
              catering: true,
              groundTransport: true,
              departureFbo: true,
              arrivalFbo: true,
              flightTime: true,
              miles: true,
              deletedAt: true,
            },
          },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          clientId: client.id,
          deletedAt: null,
          status: InvoiceStatus.SENT,
        },
        orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          reference: true,
          status: true,
          amount: true,
          fetAmount: true,
          issuedAt: true,
          dueDate: true,
          notes: true,
          createdAt: true,
          trip: { select: { id: true, reference: true, departureDate: true } },
          payments: {
            where: { deletedAt: null },
            orderBy: [{ paidAt: 'desc' }],
            select: { id: true, amount: true, paidAt: true, method: true, reference: true },
          },
        },
      }),
      this.prisma.clientCredit.findMany({
        where: { clientId: client.id, deletedAt: null },
        select: { type: true, amount: true },
      }),
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          category: { notIn: SENSITIVE_CATEGORIES },
          OR: [
            { clientId: client.id },
            { trip: { is: { clientId: client.id, deletedAt: null } } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
          trip: { select: { id: true, reference: true } },
          upload: {
            select: {
              id: true,
              filename: true,
              contentType: true,
              size: true,
              deletedAt: true,
            },
          },
        },
      }),
    ]);

    // 1. Price quotes without exposing operatorCost, grossProfit, or marginPercentage
    const quotes = quotesRaw.map((q) => {
      const priced = priceQuote({
        basePrice: q.basePrice,
        fetEnabled: q.fetEnabled,
        fetRate: q.fetRate,
        operatorCost: null,
        lineItems: q.lineItems,
      });
      return {
        id: q.id,
        reference: q.reference,
        status: q.status,
        version: q.version,
        originAirport: q.originAirport,
        destinationAirport: q.destinationAirport,
        departureDate: q.departureDate,
        returnDate: q.returnDate,
        passengers: q.passengers,
        aircraft: q.aircraft,
        quotedAircraft: q.quotedAircraft,
        exteriorImageUrl: q.exteriorImageUrl ?? q.aircraft?.exteriorImageUrl ?? null,
        basePrice: priced.basePrice,
        fetEnabled: q.fetEnabled,
        fetRate: priced.fetRate,
        fetAmount: priced.fetAmount,
        extrasTotal: priced.extrasTotal,
        totalPrice: priced.totalPrice,
        lineItems: priced.lineItems,
        terms: q.terms,
        validUntil: q.validUntil,
        sentAt: q.sentAt,
        decidedAt: q.decidedAt,
        decisionNote: q.decisionNote,
        createdAt: q.createdAt,
      };
    });

    // 2. Shape trips with live itinerary only
    const trips = tripsRaw.map((t) => {
      const liveItinerary = t.itinerary && !t.itinerary.deletedAt ? t.itinerary : null;
      const firstLeg = t.legs[0] ?? null;
      const lastLeg = t.legs[t.legs.length - 1] ?? null;
      return {
        id: t.id,
        reference: t.reference,
        status: t.status,
        departureDate: t.departureDate,
        returnDate: t.returnDate,
        passengerCount: t.passengerCount,
        aircraft: t.aircraft,
        aircraftDescription: t.aircraftDescription,
        legs: t.legs,
        itinerary: liveItinerary
          ? {
              id: liveItinerary.id,
              status: liveItinerary.status,
              confirmed: liveItinerary.confirmed,
              sentAt: liveItinerary.sentAt,
              catering: liveItinerary.catering,
              groundTransport: liveItinerary.groundTransport,
              departureFbo: liveItinerary.departureFbo ?? firstLeg?.originAirport?.assignedFbo ?? null,
              arrivalFbo: liveItinerary.arrivalFbo ?? lastLeg?.destinationAirport?.assignedFbo ?? null,
              flightTime: liveItinerary.flightTime,
              miles: liveItinerary.miles,
            }
          : null,
      };
    });

    // 3. Settle invoices
    const invoices = invoicesRaw.map((inv) => {
      const figures = invoiceFigures(inv);
      return {
        id: inv.id,
        number: invoiceNumber(inv.reference, inv.createdAt),
        status: inv.status,
        state: figures.state,
        amount: Number(inv.amount),
        fetAmount: Number(inv.fetAmount),
        total: figures.total,
        paid: figures.paid,
        balance: figures.balance,
        issuedAt: inv.issuedAt,
        dueDate: inv.dueDate,
        notes: inv.notes,
        trip: inv.trip,
        payments: inv.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paidAt: p.paidAt,
          method: p.method,
          reference: p.reference,
        })),
      };
    });

    // 4. Credit summary
    let creditedCents = 0;
    let appliedCents = 0;
    for (const entry of creditsRaw) {
      const cents = toCents(entry.amount);
      if (entry.type === CreditEntryType.CREDIT) creditedCents += cents;
      else appliedCents += cents;
    }
    const credit = summarise(creditedCents, appliedCents);

    // 5. Filter out documents whose underlying upload was removed
    const documents = documentsRaw
      .filter((d) => d.upload && !d.upload.deletedAt)
      .map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        createdAt: d.createdAt,
        trip: d.trip,
        filename: d.upload.filename,
        contentType: d.upload.contentType,
        size: d.upload.size,
      }));

    return {
      client,
      credit,
      quotes,
      trips,
      invoices,
      documents,
    };
  }

  /**
   * Allows a client to Approve or Decline an open (`SENT` / `VIEWED`) quote
   * directly from their portal.
   */
  async respondToQuote(token: string, quoteId: string, input: RespondQuotePortalInput) {
    const client = await this.resolveClient(token);
    const current = await this.prisma.quote.findFirst({
      where: { id: quoteId, clientId: client.id, deletedAt: null },
      select: {
        id: true,
        reference: true,
        status: true,
        tripRequestId: true,
      },
    });
    if (!current) {
      throw new NotFoundException('Quote not found.');
    }
    if (current.status === QuoteStatus.DRAFT) {
      throw new BadRequestException('This quote is not open for response.');
    }
    if (current.status === QuoteStatus.APPROVED || current.status === QuoteStatus.REJECTED) {
      throw new ConflictException(`Quote Q-${current.reference} has already been ${current.status.toLowerCase()}.`);
    }

    if (input.decision === 'APPROVE' && current.tripRequestId) {
      const rival = await this.prisma.quote.findFirst({
        where: {
          tripRequestId: current.tripRequestId,
          status: QuoteStatus.APPROVED,
          deletedAt: null,
          id: { not: quoteId },
        },
        select: { reference: true },
      });
      if (rival) {
        throw new ConflictException(
          `Quote Q-${rival.reference} is already approved for this trip request.`,
        );
      }
    }

    const nextStatus = input.decision === 'APPROVE' ? QuoteStatus.APPROVED : QuoteStatus.REJECTED;
    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: nextStatus,
        decidedAt: new Date(),
        decisionNote: input.notes ?? null,
      },
      select: { id: true, reference: true, status: true, decidedAt: true, decisionNote: true },
    });

    await this.audit.record({
      actorId: null,
      action: input.decision === 'APPROVE' ? 'quote.approved' : 'quote.rejected',
      entityType: 'Quote',
      entityId: quoteId,
      metadata: {
        reference: current.reference,
        via: 'client_portal',
        clientId: client.id,
        note: input.notes ?? null,
      },
    });

    return updated;
  }

  /**
   * Streams the branded Quote PDF for a quote belonging to the portal client.
   */
  async quotePdf(token: string, quoteId: string) {
    const client = await this.resolveClient(token);
    const row = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        clientId: client.id,
        deletedAt: null,
        status: { not: QuoteStatus.DRAFT },
      },
      select: {
        id: true,
        reference: true,
        status: true,
        version: true,
        departureDate: true,
        returnDate: true,
        passengers: true,
        validUntil: true,
        quotedAircraft: true,
        exteriorImageUrl: true,
        basePrice: true,
        fetEnabled: true,
        fetRate: true,
        lineItems: true,
        depositAmount: true,
        terms: true,
        originAirport: AIRPORT_SELECT,
        destinationAirport: AIRPORT_SELECT,
        aircraft: {
          select: {
            tailNumber: true,
            model: true,
            category: true,
            maxPassengers: true,
            exteriorImageUrl: true,
          },
        },
        assignedBroker: BROKER_SELECT,
      },
    });
    if (!row) throw new NotFoundException('Quote not found.');

    const priced = priceQuote({
      basePrice: row.basePrice,
      fetEnabled: row.fetEnabled,
      fetRate: row.fetRate,
      operatorCost: null,
      lineItems: row.lineItems,
    });
    const photoUrl = row.exteriorImageUrl ?? row.aircraft?.exteriorImageUrl ?? null;
    const [brand, exteriorPhoto] = await Promise.all([
      this.settings.documentBranding(),
      this.settings.readUploadRaster(photoUrl),
    ]);

    const body = await renderQuotePdf(
      {
        reference: row.reference,
        status: row.status,
        version: row.version,
        departureDate: row.departureDate,
        returnDate: row.returnDate,
        passengers: row.passengers,
        validUntil: row.validUntil,
        quotedAircraft: row.quotedAircraft,
        basePrice: priced.basePrice,
        fetEnabled: row.fetEnabled,
        fetRate: priced.fetRate,
        fetAmount: priced.fetAmount,
        extrasTotal: priced.extrasTotal,
        totalPrice: priced.totalPrice,
        depositAmount: row.depositAmount ? Number(row.depositAmount) : null,
        lineItems: priced.lineItems,
        terms: row.terms,
        client,
        originAirport: row.originAirport,
        destinationAirport: row.destinationAirport,
        aircraft: row.aircraft,
        assignedBroker: row.assignedBroker ?? client.assignedBroker,
      },
      brand,
      exteriorPhoto,
    );

    return {
      body,
      contentType: PDF_CONTENT_TYPE,
      filename: `Quote-Q-${row.reference}.pdf`,
    };
  }

  /**
   * Streams the Passenger Itinerary PDF for an itinerary belonging to the portal client.
   */
  async itineraryPdf(token: string, itineraryId: string) {
    const client = await this.resolveClient(token);
    const row = await this.prisma.itinerary.findFirst({
      where: {
        id: itineraryId,
        deletedAt: null,
        trip: { is: { clientId: client.id, deletedAt: null } },
      },
      select: {
        id: true,
        status: true,
        confirmed: true,
        flightTime: true,
        miles: true,
        catering: true,
        groundTransport: true,
        departureFbo: true,
        arrivalFbo: true,
        exteriorImageUrl: true,
        interiorImageUrl: true,
        notes: true,
        trip: {
          select: {
            reference: true,
            status: true,
            departureDate: true,
            aircraftDescription: true,
            aircraft: {
              select: {
                tailNumber: true,
                model: true,
                category: true,
                exteriorImageUrl: true,
                interiorImageUrl: true,
              },
            },
            operator: { select: { name: true } },
            assignedBroker: BROKER_SELECT,
            legs: {
              orderBy: { sequence: 'asc' },
              select: {
                sequence: true,
                originAirport: AIRPORT_SELECT,
                destinationAirport: AIRPORT_SELECT,
                departureDate: true,
                departureTime: true,
                arrivalDate: true,
                arrivalTime: true,
              },
            },
            passengers: {
              orderBy: { createdAt: 'asc' },
              select: { fullName: true, passportNumber: true },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Itinerary not found.');

    const firstLeg = row.trip.legs[0] ?? null;
    const lastLeg = row.trip.legs[row.trip.legs.length - 1] ?? null;
    const extUrl = row.exteriorImageUrl ?? row.trip.aircraft?.exteriorImageUrl ?? null;
    const intUrl = row.interiorImageUrl ?? row.trip.aircraft?.interiorImageUrl ?? null;
    const [brand, exteriorPhoto, interiorPhoto] = await Promise.all([
      this.settings.documentBranding(),
      this.settings.readUploadRaster(extUrl),
      this.settings.readUploadRaster(intUrl),
    ]);

    const body = await renderItineraryPdf(
      {
        tripReference: `TJ-${row.trip.reference}`,
        status: row.status,
        tripStatus: row.trip.status,
        departureDate: firstLeg?.departureDate ?? row.trip.departureDate,
        departureTime: firstLeg?.departureTime ?? null,
        arrivalTime: lastLeg?.arrivalTime ?? null,
        flightTime: row.flightTime,
        miles: row.miles,
        catering: row.catering,
        groundTransport: row.groundTransport,
        departureFbo: row.departureFbo ?? firstLeg?.originAirport?.assignedFbo ?? null,
        arrivalFbo: row.arrivalFbo ?? lastLeg?.destinationAirport?.assignedFbo ?? null,
        notes: row.notes,
        client,
        originAirport: firstLeg?.originAirport ?? null,
        destinationAirport: lastLeg?.destinationAirport ?? null,
        aircraft: row.trip.aircraft,
        aircraftDescription: row.trip.aircraftDescription,
        operator: row.trip.operator,
        passengers: row.trip.passengers,
        legs: row.trip.legs,
        assignedBroker: row.trip.assignedBroker ?? client.assignedBroker,
      },
      brand,
      { exteriorBuffer: exteriorPhoto, interiorBuffer: interiorPhoto },
    );

    return {
      body,
      contentType: PDF_CONTENT_TYPE,
      filename: `Itinerary-TJ-${row.trip.reference}.pdf`,
    };
  }

  /**
   * Streams the Client Invoice PDF for a sent invoice belonging to the portal client.
   */
  async invoicePdf(token: string, invoiceId: string) {
    const client = await this.resolveClient(token);
    const inv = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        clientId: client.id,
        deletedAt: null,
        status: InvoiceStatus.SENT,
      },
      select: {
        id: true,
        reference: true,
        status: true,
        amount: true,
        fetAmount: true,
        issuedAt: true,
        dueDate: true,
        notes: true,
        createdAt: true,
        trip: {
          select: {
            reference: true,
            departureDate: true,
            assignedBroker: BROKER_SELECT,
          },
        },
        payments: {
          where: { deletedAt: null },
          orderBy: [{ paidAt: 'desc' }],
          select: { amount: true, paidAt: true, method: true, reference: true },
        },
      },
    });
    if (!inv) throw new NotFoundException('Invoice not found.');

    const figures = invoiceFigures(inv);
    const num = invoiceNumber(inv.reference, inv.createdAt);
    const brand = await this.settings.documentBranding();
    const body = await renderInvoicePdf(
      {
        number: num,
        status: inv.status,
        state: figures.state,
        amount: Number(inv.amount),
        fetAmount: Number(inv.fetAmount),
        total: figures.total,
        paid: figures.paid,
        balance: figures.balance,
        issuedAt: inv.issuedAt,
        dueDate: inv.dueDate,
        notes: inv.notes,
        client,
        trip: inv.trip
          ? {
              reference: inv.trip.reference,
              departureDate: inv.trip.departureDate,
              assignedBroker: inv.trip.assignedBroker ?? client.assignedBroker,
            }
          : null,
        payments: inv.payments.map((p) => ({
          amount: Number(p.amount),
          paidAt: p.paidAt,
          method: p.method,
          reference: p.reference,
        })),
      },
      brand,
    );

    return {
      body,
      contentType: PDF_CONTENT_TYPE,
      filename: `${num}.pdf`,
    };
  }

  /**
   * Streams a non-sensitive Document Vault file belonging to the portal client.
   */
  async documentFile(token: string, documentId: string) {
    const client = await this.resolveClient(token);
    const doc = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        category: { notIn: SENSITIVE_CATEGORIES },
        OR: [
          { clientId: client.id },
          { trip: { is: { clientId: client.id, deletedAt: null } } },
        ],
      },
      select: { uploadId: true },
    });
    if (!doc) throw new NotFoundException('Document not found.');
    return this.uploads.openVouched(doc.uploadId);
  }
}

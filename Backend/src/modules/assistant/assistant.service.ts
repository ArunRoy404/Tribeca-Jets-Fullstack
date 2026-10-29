import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { Action, Module, Reach, canDo, reachOf } from '../../common/authorization/access.js';
import {
  EmptyLegStatus,
  InvoiceStatus,
  QuoteStatus,
  TaskStatus,
  TripRequestStatus,
  TripStatus,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ClientsService } from '../clients/clients.service.js';
import { TripsService } from '../trips/trips.service.js';
import { priceQuote } from '../quotes/quotes.pricing.js';
import { invoiceFigures, invoiceNumber } from '../receivables/receivables.amounts.js';
import { formatPdfDate, formatPdfMoney } from '../../common/pdf/pdf.document.js';
import {
  matchWorkflowGuide,
  suggestionsForContext,
  type AssistantLinkItem,
  type AssistantReply,
} from './assistant.knowledge.js';
import type { AskAssistantInput } from './dto/assistant.dto.js';

function clientLabel(c: { firstName?: string | null; lastName?: string | null; companyName?: string | null } | null) {
  if (!c) return '—';
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || '—';
}

function airportCode(a: { icao?: string | null; iata?: string | null } | null) {
  return a?.icao || a?.iata || '—';
}

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: ClientsService,
    private readonly trips: TripsService,
  ) {}

  suggestions(context?: string) {
    return {
      context: context || 'Dashboard',
      suggestions: suggestionsForContext(context),
    };
  }

  private quoteScopeWhere(user: AuthenticatedUser): Prisma.QuoteWhereInput {
    const reach = reachOf(user.access, Module.QUOTES);
    if (reach === Reach.ALL) return {};
    if (reach === Reach.OWN) {
      return {
        OR: [{ assignedBrokerId: user.id }, { createdById: user.id }],
      };
    }
    return { id: '__none__' };
  }

  private requestScopeWhere(user: AuthenticatedUser): Prisma.TripRequestWhereInput {
    const reach = reachOf(user.access, Module.TRIP_REQUESTS);
    if (reach === Reach.ALL) return {};
    if (reach === Reach.OWN) {
      return {
        OR: [{ assignedBrokerId: user.id }, { createdById: user.id }],
      };
    }
    return { id: '__none__' };
  }

  async ask(user: AuthenticatedUser, input: AskAssistantInput): Promise<AssistantReply> {
    const q = input.question.toLowerCase().trim();

    // 1. Check workflow / how-to guide first when phrased as a how/where question
    const guide = matchWorkflowGuide(q);
    if (guide) {
      return {
        topic: guide.topic,
        answer: guide.answer,
        items: guide.items,
        followUps: guide.followUps,
      };
    }

    // 2. Open / pending quotes
    if (q.includes('quote') || q.includes('proposal') || q.includes('approval')) {
      return this.answerQuotes(user);
    }

    // 3. Upcoming / active trips & flights
    if (q.includes('trip') && !q.includes('request')) {
      return this.answerTrips(user);
    }
    if (q.includes('flight') || q.includes('depart') || q.includes('schedule')) {
      return this.answerTrips(user);
    }

    // 4. Invoices / receivables / overdue payments
    if (q.includes('invoice') || q.includes('receivable') || q.includes('overdue') || q.includes('unpaid') || q.includes('balance')) {
      return this.answerInvoices(user);
    }

    // 5. Client follow-ups / leads
    if (q.includes('follow-up') || q.includes('follow up') || q.includes('client') || q.includes('lead')) {
      return this.answerClients(user);
    }

    // 6. Open trip requests / sourcing / empty legs
    if (q.includes('request') || q.includes('sourcing') || q.includes('empty leg')) {
      return this.answerRequestsAndEmptyLegs(user);
    }

    // 7. Tasks board
    if (q.includes('task') || q.includes('todo') || q.includes('to do')) {
      return this.answerTasks(user);
    }

    // 8. Default: Live Desk Briefing for the caller
    return this.answerDeskBriefing(user);
  }

  private async answerQuotes(user: AuthenticatedUser): Promise<AssistantReply> {
    const seesMoney = canDo(user.access, Module.QUOTES, Action.VIEW_MONEY);
    const where: Prisma.QuoteWhereInput = {
      deletedAt: null,
      status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED] },
      ...this.quoteScopeWhere(user),
    };

    const [total, rows] = await Promise.all([
      this.prisma.quote.count({ where }),
      this.prisma.quote.findMany({
        where,
        orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          reference: true,
          status: true,
          basePrice: true,
          fetEnabled: true,
          fetRate: true,
          lineItems: true,
          validUntil: true,
          client: { select: { firstName: true, lastName: true, companyName: true } },
          originAirport: { select: { icao: true, iata: true } },
          destinationAirport: { select: { icao: true, iata: true } },
        },
      }),
    ]);

    const items: AssistantLinkItem[] = rows.map((row) => {
      const route = `${airportCode(row.originAirport)} → ${airportCode(row.destinationAirport)}`;
      const priceText = seesMoney
        ? ` · ${formatPdfMoney(
            priceQuote({
              basePrice: row.basePrice,
              fetEnabled: row.fetEnabled,
              fetRate: row.fetRate,
              operatorCost: null,
              lineItems: row.lineItems,
            }).totalPrice,
          )}`
        : '';
      const expiry = row.validUntil ? ` · Valid until ${formatPdfDate(row.validUntil)}` : '';
      return {
        label: `Q-${row.reference} · ${clientLabel(row.client)}`,
        detail: `${route}${priceText}${expiry}`,
        href: `/dashboard/quotes/${row.id}`,
      };
    });

    return {
      topic: 'Open Quotes Awaiting Client Decision',
      answer:
        total === 0
          ? 'You have no sent quotes currently waiting on a client decision.'
          : `There ${total === 1 ? 'is 1 sent quote' : `are ${total} sent quotes`} awaiting client response in your scope.`,
      items,
      followUps: [
        'What trips are departing soon?',
        'Which clients have follow-ups due?',
        'How do I create a quote with FET?',
      ],
    };
  }

  private async answerTrips(user: AuthenticatedUser): Promise<AssistantReply> {
    const where: Prisma.TripWhereInput = {
      AND: [
        { deletedAt: null },
        { status: { in: [TripStatus.BOOKED, TripStatus.CONFIRMED, TripStatus.IN_FLIGHT] } },
        this.trips.visibleWhere(user),
      ],
    };

    const [total, rows] = await Promise.all([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        orderBy: [{ departureDate: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          reference: true,
          status: true,
          departureDate: true,
          client: { select: { firstName: true, lastName: true, companyName: true } },
          aircraft: { select: { tailNumber: true, model: true } },
          aircraftDescription: true,
          legs: {
            orderBy: { sequence: 'asc' },
            select: {
              originAirport: { select: { icao: true, iata: true } },
              destinationAirport: { select: { icao: true, iata: true } },
            },
          },
        },
      }),
    ]);

    const items: AssistantLinkItem[] = rows.map((t) => {
      const first = t.legs[0];
      const last = t.legs[t.legs.length - 1];
      const route = first && last ? `${airportCode(first.originAirport)} → ${airportCode(last.destinationAirport)}` : '—';
      const dep = t.departureDate ? formatPdfDate(t.departureDate) : '—';
      const ac = t.aircraft ? `${t.aircraft.tailNumber} (${t.aircraft.model})` : t.aircraftDescription || '—';
      return {
        label: `TJ-${t.reference} · ${clientLabel(t.client)}`,
        detail: `${route} · ${dep} · ${ac} · ${t.status.replace(/_/g, ' ')}`,
        href: `/dashboard/trips/${t.id}`,
      };
    });

    return {
      topic: 'Active & Upcoming Trips',
      answer:
        total === 0
          ? 'No booked, confirmed, or in-flight trips are currently scheduled in your scope.'
          : `You have ${total} active or upcoming ${total === 1 ? 'trip' : 'trips'} in your scope.`,
      items,
      followUps: [
        'Which quotes are waiting on client approval?',
        'Which invoices are currently overdue or unpaid?',
        'Where do I upload an operator itinerary?',
      ],
    };
  }

  private async answerInvoices(user: AuthenticatedUser): Promise<AssistantReply> {
    if (!canDo(user.access, Module.RECEIVABLES, Action.VIEW)) {
      return {
        topic: 'Receivables & Invoices',
        answer: 'Your account does not hold Receivables · View access, so invoice balances are hidden.',
        items: [],
        followUps: ['What trips are departing soon?', 'Which clients have follow-ups due?'],
      };
    }

    const rows = await this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        status: InvoiceStatus.SENT,
        trip: { is: this.trips.visibleWhere(user) },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        reference: true,
        status: true,
        amount: true,
        fetAmount: true,
        dueDate: true,
        createdAt: true,
        client: { select: { firstName: true, lastName: true, companyName: true } },
        payments: { where: { deletedAt: null }, select: { amount: true } },
      },
    });

    const unpaid = rows
      .map((inv) => ({ inv, figures: invoiceFigures(inv) }))
      .filter(({ figures }) => figures.balance > 0);

    const overdueCount = unpaid.filter(({ figures }) => figures.state === 'OVERDUE').length;
    const totalBalance = unpaid.reduce((sum, { figures }) => sum + figures.balance, 0);

    const items: AssistantLinkItem[] = unpaid.slice(0, 5).map(({ inv, figures }) => {
      const num = invoiceNumber(inv.reference, inv.createdAt);
      const due = inv.dueDate ? ` · Due ${formatPdfDate(inv.dueDate)}` : '';
      return {
        label: `${num} · ${clientLabel(inv.client)}`,
        detail: `${formatPdfMoney(figures.balance)} balance (${figures.state.replace(/_/g, ' ')})${due}`,
        href: `/dashboard/receivables?invoice=${inv.id}`,
      };
    });

    return {
      topic: 'Open & Overdue Client Invoices',
      answer:
        unpaid.length === 0
          ? 'All sent invoices in your scope are settled — there are no open balances.'
          : `${unpaid.length} sent ${unpaid.length === 1 ? 'invoice has' : 'invoices have'} an open balance totaling ${formatPdfMoney(totalBalance)}${overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}.`,
      items,
      followUps: [
        'How do I record a client payment?',
        'What trips are departing soon?',
        'Which quotes are waiting on client approval?',
      ],
    };
  }

  private async answerClients(user: AuthenticatedUser): Promise<AssistantReply> {
    const where: Prisma.ClientWhereInput = {
      AND: [
        { deletedAt: null },
        { nextFollowUpAt: { not: null } },
        this.clients.visibleWhere(user),
      ],
    };

    const [total, rows] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        orderBy: [{ nextFollowUpAt: 'asc' }],
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          leadStage: true,
          nextFollowUpAt: true,
          followUpNote: true,
        },
      }),
    ]);

    const items: AssistantLinkItem[] = rows.map((c) => ({
      label: clientLabel(c),
      detail: `Follow-up: ${formatPdfDate(c.nextFollowUpAt)} · Stage: ${c.leadStage}${c.followUpNote ? ` · "${c.followUpNote}"` : ''}`,
      href: `/dashboard/clients/${c.id}`,
    }));

    return {
      topic: 'Client Follow-ups Scheduled',
      answer:
        total === 0
          ? 'No clients in your book currently have a scheduled follow-up reminder.'
          : `${total} ${total === 1 ? 'client has' : 'clients have'} a scheduled follow-up in your scope.`,
      items,
      followUps: [
        'Which quotes are waiting on client approval?',
        'What trips are departing soon?',
        'How do I share the Client Portal link?',
      ],
    };
  }

  private async answerRequestsAndEmptyLegs(user: AuthenticatedUser): Promise<AssistantReply> {
    const reqWhere: Prisma.TripRequestWhereInput = {
      deletedAt: null,
      status: { in: [TripRequestStatus.OPEN, TripRequestStatus.SOURCING] },
      ...this.requestScopeWhere(user),
    };

    const [openRequestsCount, emptyLegsCount, topRequests] = await Promise.all([
      this.prisma.tripRequest.count({ where: reqWhere }),
      this.prisma.emptyLeg.count({
        where: { deletedAt: null, status: EmptyLegStatus.AVAILABLE },
      }),
      this.prisma.tripRequest.findMany({
        where: reqWhere,
        orderBy: [{ departureDate: 'asc' }, { createdAt: 'desc' }],
        take: 4,
        select: {
          id: true,
          reference: true,
          status: true,
          departureDate: true,
          client: { select: { firstName: true, lastName: true, companyName: true } },
          originAirport: { select: { icao: true, iata: true } },
          destinationAirport: { select: { icao: true, iata: true } },
        },
      }),
    ]);

    const items: AssistantLinkItem[] = topRequests.map((r) => ({
      label: `TR-${r.reference} · ${clientLabel(r.client)}`,
      detail: `${airportCode(r.originAirport)} → ${airportCode(r.destinationAirport)} · ${formatPdfDate(r.departureDate)} · ${r.status}`,
      href: `/dashboard/operator-sourcing`,
    }));

    if (emptyLegsCount > 0) {
      items.push({
        label: `${emptyLegsCount} Available Empty ${emptyLegsCount === 1 ? 'Leg' : 'Legs'}`,
        detail: 'Open Empty Legs to match available positioning flights against open enquiries.',
        href: '/dashboard/empty-legs',
      });
    }

    return {
      topic: 'Open Trip Requests & Empty Legs',
      answer: `There ${openRequestsCount === 1 ? 'is 1 open/sourcing trip request' : `are ${openRequestsCount} open/sourcing trip requests`} in your scope and ${emptyLegsCount} available empty ${emptyLegsCount === 1 ? 'leg' : 'legs'}.`,
      items,
      followUps: [
        'How does operator sourcing work?',
        'Which quotes are waiting on client approval?',
      ],
    };
  }

  private async answerTasks(user: AuthenticatedUser): Promise<AssistantReply> {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      status: { not: TaskStatus.COMPLETED },
      OR: [{ assigneeId: user.id }, { createdById: user.id }],
    };

    const [total, rows] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
      }),
    ]);

    const items: AssistantLinkItem[] = rows.map((task) => ({
      label: task.title,
      detail: `${task.priority} priority · ${task.status.replace(/_/g, ' ')}${task.dueDate ? ` · Due ${formatPdfDate(task.dueDate)}` : ''}`,
      href: '/dashboard/tasks',
    }));

    return {
      topic: 'Your Open Tasks',
      answer:
        total === 0
          ? 'You have no open tasks assigned to you right now.'
          : `You have ${total} open ${total === 1 ? 'task' : 'tasks'} on the Tasks Board.`,
      items,
      followUps: [
        'Give me my desk briefing for today',
        'What trips are departing soon?',
      ],
    };
  }

  private async answerDeskBriefing(user: AuthenticatedUser): Promise<AssistantReply> {
    const [openQuotes, activeTrips, openRequests, followUps, openTasks] = await Promise.all([
      this.prisma.quote.count({
        where: {
          deletedAt: null,
          status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED] },
          ...this.quoteScopeWhere(user),
        },
      }),
      this.prisma.trip.count({
        where: {
          AND: [
            { deletedAt: null },
            { status: { in: [TripStatus.BOOKED, TripStatus.CONFIRMED, TripStatus.IN_FLIGHT] } },
            this.trips.visibleWhere(user),
          ],
        },
      }),
      this.prisma.tripRequest.count({
        where: {
          deletedAt: null,
          status: { in: [TripRequestStatus.OPEN, TripRequestStatus.SOURCING] },
          ...this.requestScopeWhere(user),
        },
      }),
      this.prisma.client.count({
        where: {
          AND: [
            { deletedAt: null },
            { nextFollowUpAt: { not: null } },
            this.clients.visibleWhere(user),
          ],
        },
      }),
      this.prisma.task.count({
        where: {
          deletedAt: null,
          status: { not: TaskStatus.COMPLETED },
          OR: [{ assigneeId: user.id }, { createdById: user.id }],
        },
      }),
    ]);

    return {
      topic: 'Live Desk Briefing',
      answer:
        'Here is a live snapshot of your current desk workload across quotes, flights, sourcing, client follow-ups, and tasks:',
      items: [
        {
          label: `${openQuotes} Sent ${openQuotes === 1 ? 'Quote' : 'Quotes'} Awaiting Decision`,
          detail: 'Review open proposals and follow up with clients.',
          href: '/dashboard/quotes',
        },
        {
          label: `${activeTrips} Active / Upcoming ${activeTrips === 1 ? 'Trip' : 'Trips'}`,
          detail: 'Booked, confirmed, and in-flight operations in your scope.',
          href: '/dashboard/trips',
        },
        {
          label: `${openRequests} Open / Sourcing Trip ${openRequests === 1 ? 'Request' : 'Requests'}`,
          detail: 'Enquiries waiting on aircraft sourcing or a client quote.',
          href: '/dashboard/trip-requests',
        },
        {
          label: `${followUps} Client ${followUps === 1 ? 'Follow-up' : 'Follow-ups'} Scheduled`,
          detail: 'Clients in your book with a follow-up date on file.',
          href: '/dashboard/clients',
        },
        {
          label: `${openTasks} Open ${openTasks === 1 ? 'Task' : 'Tasks'}`,
          detail: 'Tasks assigned to you or created by you on the board.',
          href: '/dashboard/tasks',
        },
      ],
      followUps: [
        'Which quotes are waiting on client approval?',
        'What trips are departing soon?',
        'Which invoices are currently overdue or unpaid?',
      ],
    };
  }
}

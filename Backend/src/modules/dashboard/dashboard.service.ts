import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { paginate, type AuthenticatedUser, type Paginated } from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { Permission, Scope, scopeFor } from '../../common/authorization/permissions.js';
import { mergePages } from '../../common/database/merge-pages.js';
import { todayUtc } from '../../common/money/settlement.js';
import { TripsService } from '../trips/trips.service.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';
import { ReceivablesService } from '../receivables/receivables.service.js';
import { OperatorPaymentsService } from '../operator-payments/operator-payments.service.js';
import { EmptyLegsService } from '../empty-legs/empty-legs.service.js';
import { ClientsService } from '../clients/clients.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { invoiceNumber } from '../receivables/receivables.amounts.js';
import { payableNumber } from '../operator-payments/operator-payments.amounts.js';
import { percentChange, periodRange } from './dashboard.period.js';
import { activityWhere } from './dashboard.activity.js';
import type {
  DashboardActivityInput,
  DashboardPrioritiesInput,
  DashboardSummaryInput,
} from './dto/dashboard.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Bills due within this many days of today join the priorities as "due soon". */
const BILL_HORIZON_DAYS = 3;

/** Documents expiring within this many days — a passport needs renewing well before it lapses. */
const DOCUMENT_HORIZON_DAYS = 30;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Where one priority stands against the desk's today. */
function standing(dueAt: Date, today: Date): 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' {
  if (dueAt.getTime() < today.getTime()) return 'OVERDUE';
  if (dueAt.getTime() < today.getTime() + DAY_MS) return 'DUE_TODAY';
  return 'DUE_SOON';
}

export interface Priority {
  id: string;
  kind: 'FOLLOW_UP' | 'CLIENT_PAYMENT' | 'OPERATOR_PAYMENT' | 'TASK' | 'DOCUMENT_EXPIRY';
  state: 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON';
  dueAt: Date;
  [key: string]: unknown;
}

/** Soonest due first — the most overdue at the top — with the id breaking ties. */
const soonestFirst = (a: Priority, b: Priority) =>
  a.dueAt.getTime() - b.dueAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const PERSON = { select: { id: true, firstName: true, lastName: true, email: true } } as const;

/**
 * Dashboard (#24) — the overview. It stores nothing and owns no rule: every
 * figure is read through the module that owns it, in the caller's scope and
 * behind that module's own read permission. A section the caller may not
 * read is absent from the response, never zero.
 *
 * The lists the page shows beside these — upcoming trips, follow-ups, open
 * invoices and operator bills — are the owning modules' own list endpoints
 * with a filter, not copies here.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly requests: TripRequestsService,
    private readonly receivables: ReceivablesService,
    private readonly operatorPayments: OperatorPaymentsService,
    private readonly emptyLegs: EmptyLegsService,
    private readonly clients: ClientsService,
    private readonly tasks: TasksService,
    private readonly documents: DocumentsService,
  ) {}

  private may(user: AuthenticatedUser, permission: Permission): boolean {
    return scopeFor(user.role, permission) !== Scope.NONE;
  }

  // ---- Summary ------------------------------------------------------------

  /** The tiles: counts that are true now, and money for the chosen window against the one before. */
  async summary(user: AuthenticatedUser, query: DashboardSummaryInput) {
    const today = query.on ?? todayUtc();
    const range = periodRange(query.period, today);
    const financials = this.may(user, Permission.VIEW_FINANCIALS);

    const [upcoming, requests, current, previous, receivables, payables, emptyLegs] = await Promise.all([
      this.trips.upcomingCount(user, today),
      this.requests.stats(user),
      this.trips.periodFigures(user, range.from, range.to),
      this.trips.periodFigures(user, range.previousFrom, range.previousTo),
      this.may(user, Permission.VIEW_RECEIVABLES) ? this.receivables.stats(user, {}) : null,
      this.may(user, Permission.VIEW_OPERATOR_PAYMENTS) ? this.operatorPayments.stats(user, {}) : null,
      this.may(user, Permission.OPERATOR_SOURCING) ? this.emptyLegs.stats() : null,
    ]);

    const compare = (now: number, before: number) => ({
      current: now,
      previous: before,
      change: percentChange(now, before),
    });

    return {
      period: query.period,
      from: isoDay(range.from),
      to: isoDay(range.to),
      previousFrom: isoDay(range.previousFrom),
      previousTo: isoDay(range.previousTo),
      trips: {
        /** Active trips whose first leg leaves today or later. */
        upcoming,
        /** Booked and flown trips departing in the window. */
        departing: compare(current.tripCount, previous.tripCount),
      },
      requests: {
        /** Enquiries still being worked: open, sourcing and quoted. */
        active: requests.open + requests.sourcing + requests.quoted,
        /** Open, with no operator asked yet. */
        awaitingSourcing: requests.open,
        pipelineValue: requests.pipelineValue,
      },
      /** Absent for a role without VIEW_FINANCIALS, as on the trips board. */
      money: financials
        ? {
            revenue: { ...compare(current.revenue, previous.revenue), pricedCount: current.pricedCount },
            fet: compare(current.fet, previous.fet),
            profit: {
              ...compare(current.profit ?? 0, previous.profit ?? 0),
              marginPercentage: current.marginPercentage ?? null,
              tripCount: current.profitTripCount ?? 0,
            },
          }
        : undefined,
      receivables: receivables
        ? {
            outstanding: receivables.outstanding,
            overdue: receivables.overdue,
            overdueCount: receivables.overdueCount,
            openCount: receivables.counts.DUE + receivables.counts.PARTIALLY_PAID + receivables.counts.OVERDUE,
          }
        : undefined,
      operatorPayments: payables
        ? {
            outstanding: payables.outstanding,
            overdue: payables.overdue,
            overdueCount: payables.overdueCount,
            dueThisWeek: payables.dueThisWeek,
            dueThisWeekAmount: payables.dueThisWeekAmount,
          }
        : undefined,
      emptyLegs: emptyLegs
        ? { available: emptyLegs.available, matched: emptyLegs.matched, openValue: emptyLegs.openValue }
        : undefined,
    };
  }

  // ---- Priorities -----------------------------------------------------------

  /**
   * Today's work, most overdue first: client follow-ups due by today, the
   * caller's own tasks due by today, client invoices and operator bills
   * still owed that are overdue or due within three days, and vault
   * documents expired or expiring within 30 days. Each source is
   * read through its owner and in the caller's scope; a source the caller
   * may not read is left out, never read and hidden. Paged exactly by
   * taking `skip + take` from each source and merging.
   */
  async priorities(user: AuthenticatedUser, query: DashboardPrioritiesInput): Promise<Paginated<Priority>> {
    const today = query.on ?? todayUtc();
    const tomorrow = new Date(today.getTime() + DAY_MS);
    const horizon = new Date(today.getTime() + BILL_HORIZON_DAYS * DAY_MS);
    const documentHorizon = new Date(today.getTime() + DOCUMENT_HORIZON_DAYS * DAY_MS);
    const { skip, take } = toPrismaPagination(query);
    const need = skip + take;
    const none = Promise.resolve({ rows: [] as never[], total: 0 });

    const [followUps, tasks, invoices, payables, documents] = await Promise.all([
      this.may(user, Permission.VIEW_CLIENTS) ? this.clients.dueFollowUps(user, tomorrow, need) : none,
      this.may(user, Permission.VIEW_TASKS) ? this.tasks.dueForAssignee(user, tomorrow, need) : none,
      this.may(user, Permission.VIEW_RECEIVABLES) ? this.receivables.attention(user, horizon, need) : none,
      this.may(user, Permission.VIEW_OPERATOR_PAYMENTS) ? this.operatorPayments.attention(user, horizon, need) : none,
      this.may(user, Permission.VIEW_DOCUMENTS) ? this.documents.expiringBefore(user, documentHorizon, need) : none,
    ]);

    const sources: Priority[][] = [
      followUps.rows.map((client) => ({
        id: `FOLLOW_UP:${client.id}`,
        kind: 'FOLLOW_UP' as const,
        state: standing(client.nextFollowUpAt!, today),
        dueAt: client.nextFollowUpAt!,
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          companyName: client.companyName,
        },
        note: client.followUpNote,
        method: client.followUpMethod,
        broker: client.assignedBroker,
      })),
      tasks.rows.map((task) => ({
        id: `TASK:${task.id}`,
        kind: 'TASK' as const,
        state: standing(task.dueDate!, today),
        dueAt: task.dueDate!,
        task: { id: task.id, reference: task.reference, title: task.title, priority: task.priority },
        client: task.client,
        trip: task.trip,
      })),
      invoices.rows.map((invoice) => ({
        id: `CLIENT_PAYMENT:${invoice.id}`,
        kind: 'CLIENT_PAYMENT' as const,
        state: standing(invoice.dueDate!, today),
        dueAt: invoice.dueDate!,
        invoice: { id: invoice.id, number: invoice.number, balance: invoice.balance, state: invoice.state },
        client: invoice.client,
        trip: { id: invoice.trip.id, reference: invoice.trip.reference },
      })),
      payables.rows.map((payable) => ({
        id: `OPERATOR_PAYMENT:${payable.id}`,
        kind: 'OPERATOR_PAYMENT' as const,
        state: standing(payable.dueDate!, today),
        dueAt: payable.dueDate!,
        payable: { id: payable.id, number: payable.number, balance: payable.balance, state: payable.state },
        operator: payable.operator,
        trip: { id: payable.trip.id, reference: payable.trip.reference },
      })),
      documents.rows.map((doc) => ({
        id: `DOCUMENT_EXPIRY:${doc.id}`,
        kind: 'DOCUMENT_EXPIRY' as const,
        state: standing(doc.expiresOn!, today),
        dueAt: doc.expiresOn!,
        document: { id: doc.id, title: doc.title, category: doc.category, sensitive: doc.sensitive },
        owner: doc.owner,
      })),
    ];

    const total = followUps.total + tasks.total + invoices.total + payables.total + documents.total;
    return paginate(mergePages(sources, skip, take, soonestFirst), total, query.page, query.limit);
  }

  // ---- Activity ---------------------------------------------------------------

  /**
   * Recent Activity: the audit trail, newest first, filtered to what the
   * caller may read (`dashboard.activity.ts`). Each entry names its record by
   * a label — "TJ-1048", a client's name — never the raw metadata, which can
   * carry addresses and amounts the feed has no business repeating.
   */
  async activity(user: AuthenticatedUser, query: DashboardActivityInput) {
    const { skip, take } = toPrismaPagination(query);
    const where = activityWhere(user);
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          actor: PERSON,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const subjects = await this.subjects(rows);
    return paginate(
      rows.map((row) => ({
        ...row,
        subject: row.entityId ? (subjects.get(`${row.entityType}:${row.entityId}`) ?? null) : null,
      })),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * A label and a link target for each entry's record, one query per kind.
   * Archived rows are included — "archived TJ-1048" must still say which
   * trip. A kind with no label here renders without one rather than a guess.
   * Reads only the naming columns, and only for rows `activityWhere` already
   * allowed, so nothing here widens what the caller may learn.
   */
  private async subjects(rows: { entityType: string; entityId: string | null }[]) {
    const ids = (type: string) => [
      ...new Set(rows.filter((row) => row.entityType === type && row.entityId).map((row) => row.entityId!)),
    ];
    const labels = new Map<string, { type: string; id: string; label: string }>();
    const put = (type: string, id: string, label: string, target: { type: string; id: string } = { type, id }) =>
      labels.set(`${type}:${id}`, { ...target, label });
    const name = (row: { firstName: string | null; lastName: string | null; companyName?: string | null }) =>
      [row.firstName, row.lastName].filter(Boolean).join(' ') || row.companyName || 'Unnamed client';

    const lookups: Promise<void>[] = [];
    const when = (type: string, run: (list: string[]) => Promise<void>) => {
      const list = ids(type);
      if (list.length) lookups.push(run(list));
    };
    const idIn = (list: string[]) => ({ id: { in: list } });

    when('Trip', async (list) => {
      for (const row of await this.prisma.trip.findMany({ where: idIn(list), select: { id: true, reference: true } }))
        put('Trip', row.id, `TJ-${row.reference}`);
    });
    when('TripLeg', async (list) => {
      const legs = await this.prisma.tripLeg.findMany({
        where: idIn(list),
        select: { id: true, trip: { select: { id: true, reference: true } } },
      });
      for (const row of legs) put('TripLeg', row.id, `TJ-${row.trip.reference}`, { type: 'Trip', id: row.trip.id });
    });
    when('Itinerary', async (list) => {
      const rows = await this.prisma.itinerary.findMany({
        where: idIn(list),
        select: { id: true, trip: { select: { id: true, reference: true } } },
      });
      for (const row of rows) put('Itinerary', row.id, `TJ-${row.trip.reference}`, { type: 'Trip', id: row.trip.id });
    });
    when('Commission', async (list) => {
      const rows = await this.prisma.commission.findMany({
        where: idIn(list),
        select: { id: true, trip: { select: { id: true, reference: true } } },
      });
      for (const row of rows) put('Commission', row.id, `TJ-${row.trip.reference}`, { type: 'Commission', id: row.id });
    });
    when('Client', async (list) => {
      const rows = await this.prisma.client.findMany({
        where: idIn(list),
        select: { id: true, firstName: true, lastName: true, companyName: true },
      });
      for (const row of rows) put('Client', row.id, name(row));
    });
    when('ClientCredit', async (list) => {
      const rows = await this.prisma.clientCredit.findMany({
        where: idIn(list),
        select: { id: true, client: { select: { id: true, firstName: true, lastName: true, companyName: true } } },
      });
      for (const row of rows) put('ClientCredit', row.id, name(row.client), { type: 'Client', id: row.client.id });
    });
    when('Quote', async (list) => {
      for (const row of await this.prisma.quote.findMany({ where: idIn(list), select: { id: true, reference: true } }))
        put('Quote', row.id, `Q-${row.reference}`);
    });
    when('TripRequest', async (list) => {
      const rows = await this.prisma.tripRequest.findMany({ where: idIn(list), select: { id: true, reference: true } });
      for (const row of rows) put('TripRequest', row.id, `TR-${row.reference}`);
    });
    when('Invoice', async (list) => {
      const rows = await this.prisma.invoice.findMany({
        where: idIn(list),
        select: { id: true, reference: true, createdAt: true },
      });
      for (const row of rows) put('Invoice', row.id, invoiceNumber(row.reference, row.createdAt));
    });
    when('OperatorPayable', async (list) => {
      const rows = await this.prisma.operatorPayable.findMany({
        where: idIn(list),
        select: { id: true, reference: true, createdAt: true },
      });
      for (const row of rows) put('OperatorPayable', row.id, payableNumber(row.reference, row.createdAt));
    });
    when('Operator', async (list) => {
      for (const row of await this.prisma.operator.findMany({ where: idIn(list), select: { id: true, name: true } }))
        put('Operator', row.id, row.name);
    });
    when('OperatorQuote', async (list) => {
      const rows = await this.prisma.operatorQuote.findMany({
        where: idIn(list),
        select: { id: true, operator: { select: { name: true } } },
      });
      for (const row of rows) if (row.operator) put('OperatorQuote', row.id, row.operator.name);
    });
    when('Aircraft', async (list) => {
      const rows = await this.prisma.aircraft.findMany({ where: idIn(list), select: { id: true, tailNumber: true } });
      for (const row of rows) put('Aircraft', row.id, row.tailNumber);
    });
    when('Airport', async (list) => {
      for (const row of await this.prisma.airport.findMany({ where: idIn(list), select: { id: true, icao: true } }))
        put('Airport', row.id, row.icao);
    });
    when('EmptyLeg', async (list) => {
      const rows = await this.prisma.emptyLeg.findMany({ where: idIn(list), select: { id: true, reference: true } });
      for (const row of rows) put('EmptyLeg', row.id, `EL-${row.reference}`);
    });
    when('Task', async (list) => {
      const rows = await this.prisma.task.findMany({ where: idIn(list), select: { id: true, reference: true, title: true } });
      for (const row of rows) put('Task', row.id, `TSK-${row.reference} · ${row.title}`);
    });
    when('EmailTemplate', async (list) => {
      const rows = await this.prisma.emailTemplate.findMany({ where: idIn(list), select: { id: true, name: true } });
      for (const row of rows) put('EmailTemplate', row.id, row.name);
    });
    when('User', async (list) => {
      const rows = await this.prisma.user.findMany({
        where: idIn(list),
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      for (const row of rows) put('User', row.id, [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email);
    });

    await Promise.all(lookups);
    return labels;
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import {
  paginate,
  type AuthenticatedUser,
  type Paginated,
} from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { bulkResult, type BulkResult } from '../../common/dto/bulk.dto.js';
import {
  equalsAny,
  orderByField,
  searchAcross,
} from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import {
  Permission,
  Scope,
  scopeFor,
} from '../../common/authorization/permissions.js';
import { fromCents, toCents } from '../../common/money/cents.js';
import { InvoiceStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { TripsService } from '../trips/trips.service.js';
import {
  InvoiceState,
  invoiceFigures,
  invoiceNumber,
  paidCents,
  paymentProblem,
  referenceFromSearch,
  tally,
  todayUtc,
  totalCents,
} from './receivables.amounts.js';
import type {
  CreateInvoiceInput,
  CreatePaymentInput,
  QueryInvoicesInput,
  ReceivableStatsInput,
  UpdateInvoiceInput,
  UpdatePaymentInput,
} from './dto/receivable.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const CLIENT_SELECT = {
  select: { id: true, firstName: true, lastName: true, companyName: true, email: true, phone: true },
} satisfies Prisma.ClientDefaultArgs;

const TRIP_SELECT = {
  select: {
    id: true,
    reference: true,
    status: true,
    departureDate: true,
    clientId: true,
    assignedBrokerId: true,
    assignedBroker: ACTOR_SELECT,
  },
} satisfies Prisma.TripDefaultArgs;

/** The live payments, newest first — the list reads the latest method from them. */
const LIVE_PAYMENTS = {
  where: { deletedAt: null },
  orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
  select: { id: true, amount: true, paidAt: true, method: true },
} satisfies Prisma.Invoice$paymentsArgs;

const PAYMENT_SELECT = {
  id: true,
  invoiceId: true,
  amount: true,
  paidAt: true,
  method: true,
  reference: true,
  notes: true,
  createdAt: true,
  createdBy: ACTOR_SELECT,
  updatedAt: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.InvoicePaymentSelect;

const INVOICE_LIST_SELECT = {
  id: true,
  reference: true,
  tripId: true,
  trip: TRIP_SELECT,
  clientId: true,
  client: CLIENT_SELECT,
  amount: true,
  fetAmount: true,
  status: true,
  issuedAt: true,
  dueDate: true,
  notes: true,
  payments: LIVE_PAYMENTS,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.InvoiceSelect;

/** The detail view extends the list's: the full payment ledger and who typed it. */
const INVOICE_DETAIL_SELECT = {
  ...INVOICE_LIST_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.InvoiceSelect;

type ListRow = Prisma.InvoiceGetPayload<{ select: typeof INVOICE_LIST_SELECT }>;

/** Exactly what an invoice's figures are worked out from. */
const FIGURES_SELECT = {
  id: true,
  amount: true,
  fetAmount: true,
  status: true,
  dueDate: true,
  payments: { where: { deletedAt: null }, select: { amount: true } },
} satisfies Prisma.InvoiceSelect;

const money = (value: Prisma.Decimal) => fromCents(toCents(value));

/**
 * Receivables (#16, scope §6.14 and §9.3) — what clients owe for their trips,
 * and what has come in.
 *
 * An invoice stores what the client was billed; its payments are a ledger
 * under it. Paid, balance and state are computed on every read in
 * `receivables.amounts.ts`, so withdrawing a mistaken payment moves every
 * figure with it and nothing is left behind to contradict it.
 *
 * Row-level scope is the trip's: a broker reads and bills the invoices on the
 * trips they may see, through `TripsService.visibleWhere`, so the two cannot
 * drift apart.
 */
@Injectable()
export class ReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trips: TripsService,
  ) {}

  // ---- Scope ------------------------------------------------------------

  private scope(user: AuthenticatedUser): Prisma.InvoiceWhereInput {
    if (scopeFor(user.role, Permission.VIEW_RECEIVABLES) === Scope.ALL) return {};
    return { trip: this.trips.visibleWhere(user) };
  }

  /**
   * Archiving an invoice and withdrawing a payment take money off the books,
   * so they are an administrator's or senior broker's call — finer than the
   * permission, the same split clients make.
   */
  private assertMayArchive(user: AuthenticatedUser, what: string): void {
    if (scopeFor(user.role, Permission.MANAGE_RECEIVABLES) !== Scope.ALL) {
      throw new ForbiddenException(`Only an administrator or senior broker can ${what}.`);
    }
  }

  // ---- Shaping ----------------------------------------------------------

  private serialise(row: ListRow) {
    const { payments, ...rest } = row;
    const figures = invoiceFigures({ ...row, payments });
    const latest = payments[0] ?? null;
    return {
      ...rest,
      number: invoiceNumber(row.reference, row.createdAt),
      amount: money(row.amount),
      fetAmount: money(row.fetAmount),
      total: figures.total,
      paid: figures.paid,
      balance: figures.balance,
      /** Where it stands — computed, never stored. */
      state: figures.state,
      paymentCount: payments.length,
      lastPayment: latest ? { paidAt: latest.paidAt, method: latest.method } : null,
    };
  }

  private serialisePayment(row: Prisma.InvoicePaymentGetPayload<{ select: typeof PAYMENT_SELECT }>) {
    return { ...row, amount: money(row.amount) };
  }

  // ---- Reads ------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryInvoicesInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const base: Prisma.InvoiceWhereInput = {
      AND: [
        archiveFilter(query.archived),
        this.scope(user),
        equalsAny(query, ['tripId', 'clientId']),
        query.brokerId ? { trip: { assignedBrokerId: query.brokerId } } : {},
        query.search ? this.searchWhere(query.search) : {},
      ],
    };
    const where = query.state ? { AND: [base, await this.stateWhere(base, query.state)] } : base;

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy:
          query.sortBy === 'dueDate' || query.sortBy === 'issuedAt'
            ? [{ [query.sortBy]: { sort: query.sortOrder, nulls: 'last' } }, { reference: 'desc' }]
            : orderByField(query.sortBy, query.sortOrder),
        select: INVOICE_LIST_SELECT,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginate(rows.map((row) => this.serialise(row)), total, query.page, query.limit);
  }

  /**
   * The state filter. The state is computed from payments and today's date,
   * so no column can be filtered on: narrow by the stored status first, work
   * each candidate's state out with the same function every read uses, and
   * filter by the ids that match. A list that paged the rows first and
   * filtered the page afterwards would show short pages and a wrong total.
   */
  private async stateWhere(base: Prisma.InvoiceWhereInput, state: InvoiceState): Promise<Prisma.InvoiceWhereInput> {
    const today = todayUtc();
    const stored: Prisma.InvoiceWhereInput =
      state === InvoiceState.DRAFT
        ? { status: { in: [InvoiceStatus.DRAFT] } }
        : state === InvoiceState.CANCELLED
          ? { status: InvoiceStatus.CANCELLED }
          : state === InvoiceState.OVERDUE
            ? { status: InvoiceStatus.SENT, dueDate: { lt: today } }
            : { status: { in: [InvoiceStatus.SENT, InvoiceStatus.DRAFT] } };
    const candidates = await this.prisma.invoice.findMany({
      where: { AND: [base, stored] },
      select: FIGURES_SELECT,
    });
    const ids = candidates
      .filter((row) => invoiceFigures(row, today).state === state)
      .map((row) => row.id);
    return { id: { in: ids } };
  }

  /** "INV-2026-0042", "TJ-1048", the billed client and the trip's client. */
  private searchWhere(term: string): Prisma.InvoiceWhereInput {
    const reference = referenceFromSearch(term);
    const trip = /^TJ-?(\d{1,9})$/i.exec(term.trim())?.[1] ?? null;
    return {
      OR: [
        ...(reference !== null ? [{ reference }] : []),
        ...(trip !== null ? [{ trip: { reference: Number(trip) } }] : []),
        { client: searchAcross(term, ['firstName', 'lastName', 'companyName', 'email']) },
        { trip: { client: searchAcross(term, ['firstName', 'lastName', 'companyName']) } },
        searchAcross(term, ['notes']),
      ],
    };
  }

  /** Archived invoices included — the Archived tab links here. */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.invoice.findFirst({
      where: { id, ...this.scope(user) },
      select: INVOICE_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Invoice not found');

    const payments = await this.prisma.invoicePayment.findMany({
      where: { invoiceId: id },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      select: PAYMENT_SELECT,
    });

    return {
      ...this.serialise(row),
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      payments: payments.filter((p) => p.deletedAt === null).map((p) => this.serialisePayment(p)),
      /** Payments taken off the record, with who withdrew them — never erased. */
      withdrawnPayments: payments.filter((p) => p.deletedAt !== null).map((p) => this.serialisePayment(p)),
    };
  }

  /**
   * The tiles, over the caller's scope — optionally one client (their total
   * spent) or one trip. Summed here in cents from the computed figures: the
   * database cannot `SUM` a balance that is itself a sum of another table.
   */
  async stats(user: AuthenticatedUser, query: ReceivableStatsInput) {
    const rows = await this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        ...this.scope(user),
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.tripId ? { tripId: query.tripId } : {}),
      },
      select: FIGURES_SELECT,
    });
    return tally(rows);
  }

  // ---- Link checks --------------------------------------------------------

  private async assertClient(id: string): Promise<void> {
    const client = await this.prisma.client.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!client) throw new BadRequestException('That client does not exist');
    if (client.deletedAt) throw new BadRequestException('That client has been archived. Restore them, or choose another.');
  }

  /** A live invoice in the caller's scope, with what its figures come from. */
  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null, ...this.scope(user) },
      select: { ...FIGURES_SELECT, reference: true, createdAt: true, clientId: true, issuedAt: true },
    });
    if (!row) throw new NotFoundException('Invoice not found');
    return row;
  }

  // ---- Invoice writes -----------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateInvoiceInput) {
    const trip = await this.trips.billingTarget(user, dto.tripId);
    if (dto.clientId && dto.clientId !== trip.clientId) await this.assertClient(dto.clientId);

    const created = await this.prisma.invoice.create({
      data: {
        tripId: trip.id,
        clientId: dto.clientId ?? trip.clientId,
        amount: dto.amount,
        fetAmount: dto.fetAmount ?? 0,
        status: dto.status,
        issuedAt: dto.status === InvoiceStatus.SENT ? (dto.issuedAt ?? todayUtc()) : null,
        dueDate: dto.dueDate ?? null,
        notes: dto.notes ?? null,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true, reference: true, createdAt: true },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'invoice.created',
      entityType: 'Invoice',
      entityId: created.id,
      metadata: {
        number: invoiceNumber(created.reference, created.createdAt),
        tripReference: trip.reference,
        status: dto.status,
      },
    });

    return this.findOne(user, created.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateInvoiceInput) {
    const current = await this.findLive(user, id);
    const paid = paidCents(current.payments);

    if (dto.clientId !== undefined && dto.clientId !== current.clientId) await this.assertClient(dto.clientId);

    // The total may move, but never below what has already come in — that
    // would leave the client owing a negative amount.
    const total = totalCents({
      amount: dto.amount ?? current.amount,
      fetAmount: dto.fetAmount ?? current.fetAmount,
    });
    if (total < paid) {
      throw new BadRequestException(
        `This invoice has ${fromCents(paid).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} paid against it; its total cannot go below that.`,
      );
    }

    // A draft or a cancelled invoice holds no money. Payments are withdrawn
    // first, so the ledger says where the money went.
    const status = dto.status ?? current.status;
    if (status !== InvoiceStatus.SENT && paid > 0) {
      throw new BadRequestException(
        status === InvoiceStatus.CANCELLED
          ? 'This invoice has payments recorded against it. Withdraw them before cancelling it.'
          : 'This invoice has payments recorded against it, so it cannot go back to draft.',
      );
    }

    // Sent means a day it was sent; a draft has none. A cancelled invoice keeps
    // the day it went out — it was still sent.
    const issuedAt =
      status === InvoiceStatus.DRAFT
        ? null
        : dto.issuedAt !== undefined && dto.issuedAt !== null
          ? dto.issuedAt
          : (current.issuedAt ?? (status === InvoiceStatus.SENT ? todayUtc() : null));

    await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.fetAmount !== undefined ? { fetAmount: dto.fetAmount } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        issuedAt,
        updatedById: user.id,
      },
    });

    const statusChanged = dto.status !== undefined && dto.status !== current.status;
    await this.audit.record({
      actorId: user.id,
      action: statusChanged ? 'invoice.status_changed' : 'invoice.updated',
      entityType: 'Invoice',
      entityId: id,
      metadata: {
        number: invoiceNumber(current.reference, current.createdAt),
        fields: Object.keys(dto),
        ...(statusChanged ? { from: current.status, to: dto.status } : {}),
      },
    });

    return this.findOne(user, id);
  }

  /**
   * Archive. An invoice with money against it cannot be archived — the
   * payments would vanish from every total with it. Withdraw them first, or
   * leave the invoice where it is.
   */
  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertMayArchive(user, 'archive an invoice');
    const row = await this.findLive(user, id);
    if (row.payments.length > 0) {
      throw new BadRequestException('This invoice has payments recorded against it. Withdraw them before archiving it.');
    }
    await this.prisma.invoice.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'invoice.archived',
      entityType: 'Invoice',
      entityId: id,
      metadata: { number: invoiceNumber(row.reference, row.createdAt) },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    this.assertMayArchive(user, 'restore an invoice');
    const row = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, reference: true, createdAt: true },
    });
    if (!row) throw new NotFoundException('Archived invoice not found');
    await this.prisma.invoice.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'invoice.restored',
      entityType: 'Invoice',
      entityId: id,
      metadata: { number: invoiceNumber(row.reference, row.createdAt) },
    });
    return this.findOne(user, id);
  }

  /** Invoices carrying live payments are skipped, and come back in `skipped`. */
  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    this.assertMayArchive(user, 'archive an invoice');
    const targets = await this.prisma.invoice.findMany({
      where: { id: { in: ids }, deletedAt: null, payments: { none: { deletedAt: null } } },
      select: { id: true, reference: true, createdAt: true },
    });
    if (targets.length) {
      await this.prisma.invoice.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'invoice.bulk_archived',
        entityType: 'Invoice',
        metadata: { count: targets.length, numbers: targets.map((row) => invoiceNumber(row.reference, row.createdAt)) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    this.assertMayArchive(user, 'restore an invoice');
    const targets = await this.prisma.invoice.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, reference: true, createdAt: true },
    });
    if (targets.length) {
      await this.prisma.invoice.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'invoice.bulk_restored',
        entityType: 'Invoice',
        metadata: { count: targets.length, numbers: targets.map((row) => invoiceNumber(row.reference, row.createdAt)) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  // ---- Payments -----------------------------------------------------------

  /** A payment settles an invoice the client has been sent — and only that. */
  private assertTakesPayments(status: InvoiceStatus): void {
    if (status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('A cancelled invoice cannot take payments.');
    }
    if (status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Mark this invoice as sent before recording a payment against it.');
    }
  }

  private assertFits(total: number, otherPaid: number, amount: number): void {
    const problem = paymentProblem(total, otherPaid, amount);
    if (problem) throw new BadRequestException(problem);
  }

  private async findPayment(invoiceId: string, paymentId: string, archived: boolean) {
    const row = await this.prisma.invoicePayment.findFirst({
      where: { id: paymentId, invoiceId, deletedAt: archived ? { not: null } : null },
      select: { id: true, amount: true },
    });
    if (!row) throw new NotFoundException(archived ? 'Withdrawn payment not found' : 'Payment not found');
    return row;
  }

  async recordPayment(user: AuthenticatedUser, invoiceId: string, dto: CreatePaymentInput) {
    const invoice = await this.findLive(user, invoiceId);
    this.assertTakesPayments(invoice.status);
    this.assertFits(totalCents(invoice), paidCents(invoice.payments), toCents(dto.amount));

    const payment = await this.prisma.invoicePayment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        paidAt: dto.paidAt ?? todayUtc(),
        method: dto.method,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true },
    });
    // Touching the invoice records who last moved its money.
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { updatedById: user.id } });

    await this.audit.record({
      actorId: user.id,
      action: 'invoice.payment_recorded',
      entityType: 'Invoice',
      entityId: invoiceId,
      metadata: {
        number: invoiceNumber(invoice.reference, invoice.createdAt),
        paymentId: payment.id,
        amount: dto.amount,
        method: dto.method,
      },
    });

    return this.findOne(user, invoiceId);
  }

  async updatePayment(user: AuthenticatedUser, invoiceId: string, paymentId: string, dto: UpdatePaymentInput) {
    const invoice = await this.findLive(user, invoiceId);
    const payment = await this.findPayment(invoiceId, paymentId, false);

    if (dto.amount !== undefined) {
      // Measured against the invoice *without* this payment, or raising it by
      // a cent is checked against a total that still contains its old value.
      const others = paidCents(invoice.payments) - toCents(payment.amount);
      this.assertFits(totalCents(invoice), others, toCents(dto.amount));
    }

    await this.prisma.invoicePayment.update({
      where: { id: paymentId },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.paidAt !== undefined ? { paidAt: dto.paidAt } : {}),
        ...(dto.method !== undefined ? { method: dto.method } : {}),
        ...(dto.reference !== undefined ? { reference: dto.reference } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedById: user.id,
      },
    });
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { updatedById: user.id } });

    await this.audit.record({
      actorId: user.id,
      action: 'invoice.payment_updated',
      entityType: 'Invoice',
      entityId: invoiceId,
      metadata: {
        number: invoiceNumber(invoice.reference, invoice.createdAt),
        paymentId,
        fields: Object.keys(dto),
      },
    });

    return this.findOne(user, invoiceId);
  }

  /** Withdraw a payment entered by mistake. It stays on the record, withdrawn. */
  async withdrawPayment(user: AuthenticatedUser, invoiceId: string, paymentId: string) {
    this.assertMayArchive(user, 'withdraw a payment');
    const invoice = await this.findLive(user, invoiceId);
    const payment = await this.findPayment(invoiceId, paymentId, false);

    await this.prisma.invoicePayment.update({
      where: { id: paymentId },
      data: { ...archiveData(user.id), updatedById: user.id },
    });
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { updatedById: user.id } });

    await this.audit.record({
      actorId: user.id,
      action: 'invoice.payment_withdrawn',
      entityType: 'Invoice',
      entityId: invoiceId,
      metadata: {
        number: invoiceNumber(invoice.reference, invoice.createdAt),
        paymentId,
        amount: money(payment.amount),
      },
    });

    return this.findOne(user, invoiceId);
  }

  /**
   * Bring a withdrawn payment back — re-checked against the invoice as it is
   * now. A $12,000 wire withdrawn in March and restored in June lands on
   * whatever the invoice holds by then; without the check, withdraw-and-
   * restore walks straight past the rule that an invoice is never overpaid.
   */
  async restorePayment(user: AuthenticatedUser, invoiceId: string, paymentId: string) {
    this.assertMayArchive(user, 'restore a payment');
    const invoice = await this.findLive(user, invoiceId);
    const payment = await this.findPayment(invoiceId, paymentId, true);
    this.assertTakesPayments(invoice.status);
    this.assertFits(totalCents(invoice), paidCents(invoice.payments), toCents(payment.amount));

    await this.prisma.invoicePayment.update({
      where: { id: paymentId },
      data: { ...restoreData(user.id), updatedById: user.id },
    });
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { updatedById: user.id } });

    await this.audit.record({
      actorId: user.id,
      action: 'invoice.payment_restored',
      entityType: 'Invoice',
      entityId: invoiceId,
      metadata: {
        number: invoiceNumber(invoice.reference, invoice.createdAt),
        paymentId,
        amount: money(payment.amount),
      },
    });

    return this.findOne(user, invoiceId);
  }
}

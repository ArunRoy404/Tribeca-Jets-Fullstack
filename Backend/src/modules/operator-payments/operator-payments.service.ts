import {
  BadRequestException,
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
import { OperatorPayableStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { TripsService } from '../trips/trips.service.js';
import {
  MovementDirection,
  MovementKind,
  dayRange,
  type Movement,
  type MovementFilter,
  type MovementSlice,
  type MovementTotals,
} from '../../common/money/movements.js';
import {
  PayableState,
  paidCents,
  payableFigures,
  payableNumber,
  paymentProblem,
  referenceFromSearch,
  tally,
  todayUtc,
} from './operator-payments.amounts.js';
import type {
  CreatePayableInput,
  CreatePaymentInput,
  PayableStatsInput,
  QueryPayablesInput,
  UpdatePayableInput,
  UpdatePaymentInput,
} from './dto/operator-payment.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const TRIP_SELECT = {
  select: {
    id: true,
    reference: true,
    status: true,
    departureDate: true,
    operatorId: true,
    client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
    assignedBrokerId: true,
    assignedBroker: ACTOR_SELECT,
  },
} satisfies Prisma.TripDefaultArgs;

const LIVE_PAYMENTS = {
  where: { deletedAt: null },
  orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
  select: { id: true, amount: true, paidAt: true, method: true },
} satisfies Prisma.OperatorPayable$paymentsArgs;

const PAYMENT_SELECT = {
  id: true,
  payableId: true,
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
} satisfies Prisma.OperatorPayablePaymentSelect;

const PAYABLE_LIST_SELECT = {
  id: true,
  reference: true,
  tripId: true,
  trip: TRIP_SELECT,
  operatorId: true,
  operator: { select: { id: true, name: true, paymentTerms: true } },
  amount: true,
  status: true,
  dueDate: true,
  operatorReference: true,
  notes: true,
  payments: LIVE_PAYMENTS,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.OperatorPayableSelect;

const PAYABLE_DETAIL_SELECT = {
  ...PAYABLE_LIST_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.OperatorPayableSelect;

type ListRow = Prisma.OperatorPayableGetPayload<{ select: typeof PAYABLE_LIST_SELECT }>;

/** Exactly what a payable's figures are worked out from. */
const FIGURES_SELECT = {
  id: true,
  amount: true,
  status: true,
  dueDate: true,
  payments: { where: { deletedAt: null }, select: { amount: true } },
} satisfies Prisma.OperatorPayableSelect;

const money = (value: Prisma.Decimal) => fromCents(toCents(value));

/**
 * Operator Payments (#17, scope §6.14 and §9.3) — what Tribeca owes operators
 * for its trips, and what has been sent.
 *
 * A payable stores the operator's bill; its payments are a ledger under it.
 * Paid, balance and state are computed on every read with the settling
 * arithmetic Receivables shares. Reads are scoped to the trips the caller may
 * see (a broker reads the bills on their own trips); every write is an
 * administrator's or senior broker's, because it is money leaving the
 * company — the matrix says so, and the guard enforces it before this runs.
 */
@Injectable()
export class OperatorPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trips: TripsService,
  ) {}

  // ---- Scope ------------------------------------------------------------

  private scope(user: AuthenticatedUser): Prisma.OperatorPayableWhereInput {
    if (scopeFor(user.role, Permission.VIEW_OPERATOR_PAYMENTS) === Scope.ALL) return {};
    return { trip: this.trips.visibleWhere(user) };
  }

  // ---- Shaping ----------------------------------------------------------

  private serialise(row: ListRow) {
    const { payments, ...rest } = row;
    const figures = payableFigures({ ...row, payments });
    const latest = payments[0] ?? null;
    return {
      ...rest,
      number: payableNumber(row.reference, row.createdAt),
      amount: money(row.amount),
      total: figures.total,
      paid: figures.paid,
      balance: figures.balance,
      /** Where it stands — computed, never stored. */
      state: figures.state,
      paymentCount: payments.length,
      lastPayment: latest ? { paidAt: latest.paidAt, method: latest.method } : null,
    };
  }

  private serialisePayment(row: Prisma.OperatorPayablePaymentGetPayload<{ select: typeof PAYMENT_SELECT }>) {
    return { ...row, amount: money(row.amount) };
  }

  // ---- Reads ------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryPayablesInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const base: Prisma.OperatorPayableWhereInput = {
      AND: [
        archiveFilter(query.archived),
        this.scope(user),
        equalsAny(query, ['tripId', 'operatorId']),
        query.brokerId ? { trip: { assignedBrokerId: query.brokerId } } : {},
        query.search ? this.searchWhere(query.search) : {},
      ],
    };
    const where = query.state ? { AND: [base, await this.stateWhere(base, query.state)] } : base;

    const [rows, total] = await Promise.all([
      this.prisma.operatorPayable.findMany({
        where,
        skip,
        take,
        orderBy:
          query.sortBy === 'dueDate'
            ? [{ dueDate: { sort: query.sortOrder, nulls: 'last' } }, { reference: 'desc' }]
            : orderByField(query.sortBy, query.sortOrder),
        select: PAYABLE_LIST_SELECT,
      }),
      this.prisma.operatorPayable.count({ where }),
    ]);

    return paginate(rows.map((row) => this.serialise(row)), total, query.page, query.limit);
  }

  /**
   * The state filter: narrow by the stored status, work each candidate's
   * state out with the function every read uses, filter by the matching ids
   * (AGENTS.md, "a computed state is filtered by computing it").
   */
  private async stateWhere(
    base: Prisma.OperatorPayableWhereInput,
    state: PayableState,
  ): Promise<Prisma.OperatorPayableWhereInput> {
    const today = todayUtc();
    const stored: Prisma.OperatorPayableWhereInput =
      state === PayableState.CANCELLED
        ? { status: OperatorPayableStatus.CANCELLED }
        : state === PayableState.OVERDUE
          ? { status: OperatorPayableStatus.OPEN, dueDate: { lt: today } }
          : { status: OperatorPayableStatus.OPEN };
    const candidates = await this.prisma.operatorPayable.findMany({
      where: { AND: [base, stored] },
      select: FIGURES_SELECT,
    });
    const ids = candidates.filter((row) => payableFigures(row, today).state === state).map((row) => row.id);
    return { id: { in: ids } };
  }

  /** "OP-2026-0045", "TJ-1048", the operator, their reference, the trip's client. */
  private searchWhere(term: string): Prisma.OperatorPayableWhereInput {
    const reference = referenceFromSearch(term);
    const trip = /^TJ-?(\d{1,9})$/i.exec(term.trim())?.[1] ?? null;
    return {
      OR: [
        ...(reference !== null ? [{ reference }] : []),
        ...(trip !== null ? [{ trip: { reference: Number(trip) } }] : []),
        { operator: searchAcross(term, ['name']) },
        { trip: { client: searchAcross(term, ['firstName', 'lastName', 'companyName']) } },
        searchAcross(term, ['operatorReference', 'notes']),
      ],
    };
  }

  /** Archived payables included — the Archived tab links here. */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.operatorPayable.findFirst({
      where: { id, ...this.scope(user) },
      select: PAYABLE_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Operator payable not found');

    const payments = await this.prisma.operatorPayablePayment.findMany({
      where: { payableId: id },
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

  /** The tiles over the caller's scope — optionally one operator or one trip. */
  async stats(user: AuthenticatedUser, query: PayableStatsInput) {
    const rows = await this.prisma.operatorPayable.findMany({
      where: {
        deletedAt: null,
        ...this.scope(user),
        ...(query.operatorId ? { operatorId: query.operatorId } : {}),
        ...(query.tripId ? { tripId: query.tripId } : {}),
      },
      select: FIGURES_SELECT,
    });
    return tally(rows);
  }

  // ---- For other modules --------------------------------------------------

  /**
   * Total paid to each operator — every live payment on a live, uncancelled
   * payable — for the operators list and detail (the second pass #17 owes
   * Operators). Unscoped by design: the caller decides whether the viewer may
   * see it, and omits it when not.
   */
  async paidByOperator(operatorIds: string[]): Promise<Map<string, number>> {
    if (operatorIds.length === 0) return new Map();
    const rows = await this.prisma.operatorPayable.findMany({
      where: { operatorId: { in: operatorIds }, deletedAt: null, status: OperatorPayableStatus.OPEN },
      select: { operatorId: true, payments: { where: { deletedAt: null }, select: { amount: true } } },
    });
    const cents = new Map<string, number>();
    for (const row of rows) {
      cents.set(row.operatorId, (cents.get(row.operatorId) ?? 0) + paidCents(row.payments));
    }
    return new Map(operatorIds.map((id) => [id, fromCents(cents.get(id) ?? 0)]));
  }

  // ---- For the Transactions ledger (#19) ---------------------------------

  /** Live payments on live bills the caller may see, narrowed by the ledger's filter. */
  private movementWhere(user: AuthenticatedUser, filter: MovementFilter): Prisma.OperatorPayablePaymentWhereInput {
    const term = filter.search?.trim();
    const reference = term ? referenceFromSearch(term) : null;
    const trip = term ? (/^TJ-?(\d{1,9})$/i.exec(term)?.[1] ?? null) : null;
    return {
      deletedAt: null,
      ...(dayRange(filter) ? { paidAt: dayRange(filter) } : {}),
      payable: {
        deletedAt: null,
        ...this.scope(user),
        ...(filter.tripId ? { tripId: filter.tripId } : {}),
      },
      ...(term
        ? {
            OR: [
              ...(reference !== null ? [{ payable: { reference } }] : []),
              ...(trip !== null ? [{ payable: { trip: { reference: Number(trip) } } }] : []),
              { payable: { operator: searchAcross(term, ['name']) } },
              { payable: searchAcross(term, ['operatorReference']) },
              searchAcross(term, ['reference']),
            ],
          }
        : {}),
    };
  }

  /** The newest (or oldest) `take` payments sent, as ledger rows, and how many match. */
  async movements(user: AuthenticatedUser, filter: MovementFilter, take: number): Promise<MovementSlice> {
    const where = this.movementWhere(user, filter);
    const [rows, total] = await Promise.all([
      this.prisma.operatorPayablePayment.findMany({
        where,
        take,
        orderBy: [{ paidAt: filter.order }, { createdAt: filter.order }, { id: filter.order }],
        select: {
          id: true,
          amount: true,
          paidAt: true,
          method: true,
          reference: true,
          createdAt: true,
          payable: {
            select: {
              id: true,
              reference: true,
              createdAt: true,
              operator: { select: { id: true, name: true } },
              trip: { select: { id: true, reference: true, assignedBroker: ACTOR_SELECT } },
            },
          },
        },
      }),
      this.prisma.operatorPayablePayment.count({ where }),
    ]);
    return {
      total,
      rows: rows.map(
        (row): Movement => ({
          id: `${MovementKind.OPERATOR_PAYMENT}:${row.id}`,
          kind: MovementKind.OPERATOR_PAYMENT,
          direction: MovementDirection.OUT,
          date: row.paidAt,
          amount: money(row.amount),
          method: row.method,
          reference: row.reference,
          document: { id: row.payable.id, number: payableNumber(row.payable.reference, row.payable.createdAt) },
          counterparty: { type: 'OPERATOR', id: row.payable.operator.id, name: row.payable.operator.name },
          trip: { id: row.payable.trip.id, reference: row.payable.trip.reference },
          broker: row.payable.trip.assignedBroker,
          createdAt: row.createdAt,
        }),
      ),
    };
  }

  /** Every payment sent under the filter, counted and summed in cents. */
  async movementTotals(user: AuthenticatedUser, filter: MovementFilter): Promise<MovementTotals> {
    const rows = await this.prisma.operatorPayablePayment.findMany({
      where: this.movementWhere(user, filter),
      select: { amount: true },
    });
    return { count: rows.length, cents: paidCents(rows), unvalued: 0 };
  }

  // ---- Link checks --------------------------------------------------------

  private async assertOperator(id: string): Promise<void> {
    const row = await this.prisma.operator.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!row) throw new BadRequestException('That operator does not exist');
    if (row.deletedAt) throw new BadRequestException('That operator has been archived. Restore it, or choose another.');
  }

  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.operatorPayable.findFirst({
      where: { id, deletedAt: null, ...this.scope(user) },
      select: { ...FIGURES_SELECT, reference: true, createdAt: true, operatorId: true },
    });
    if (!row) throw new NotFoundException('Operator payable not found');
    return row;
  }

  // ---- Payable writes -----------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreatePayableInput) {
    const trip = await this.trips.billingTarget(user, dto.tripId);
    const operatorId = dto.operatorId ?? trip.operatorId;
    if (!operatorId) {
      throw new BadRequestException(`TJ-${trip.reference} has no operator yet. Choose who billed it.`);
    }
    // The trip's own operator is not re-checked — archiving them later must
    // not stop the desk recording the bill they already sent.
    if (dto.operatorId && dto.operatorId !== trip.operatorId) await this.assertOperator(dto.operatorId);

    const created = await this.prisma.operatorPayable.create({
      data: {
        tripId: trip.id,
        operatorId,
        amount: dto.amount,
        dueDate: dto.dueDate ?? null,
        operatorReference: dto.operatorReference ?? null,
        notes: dto.notes ?? null,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true, reference: true, createdAt: true },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'operator_payable.created',
      entityType: 'OperatorPayable',
      entityId: created.id,
      metadata: { number: payableNumber(created.reference, created.createdAt), tripReference: trip.reference },
    });

    return this.findOne(user, created.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdatePayableInput) {
    const current = await this.findLive(user, id);
    const paid = paidCents(current.payments);

    if (dto.operatorId !== undefined && dto.operatorId !== current.operatorId) await this.assertOperator(dto.operatorId);

    if (dto.amount !== undefined && toCents(dto.amount) < paid) {
      throw new BadRequestException(
        `${fromCents(paid).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} has already been paid against this bill; its amount cannot go below that.`,
      );
    }
    if (dto.status === OperatorPayableStatus.CANCELLED && current.status !== OperatorPayableStatus.CANCELLED && paid > 0) {
      throw new BadRequestException('This bill has payments recorded against it. Withdraw them before cancelling it.');
    }

    await this.prisma.operatorPayable.update({
      where: { id },
      data: {
        ...(dto.operatorId !== undefined ? { operatorId: dto.operatorId } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}),
        ...(dto.operatorReference !== undefined ? { operatorReference: dto.operatorReference } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedById: user.id,
      },
    });

    const statusChanged = dto.status !== undefined && dto.status !== current.status;
    await this.audit.record({
      actorId: user.id,
      action: statusChanged ? 'operator_payable.status_changed' : 'operator_payable.updated',
      entityType: 'OperatorPayable',
      entityId: id,
      metadata: {
        number: payableNumber(current.reference, current.createdAt),
        fields: Object.keys(dto),
        ...(statusChanged ? { from: current.status, to: dto.status } : {}),
      },
    });

    return this.findOne(user, id);
  }

  /** Archive — only with no live payments, or they would vanish from every total. */
  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const row = await this.findLive(user, id);
    if (row.payments.length > 0) {
      throw new BadRequestException('This bill has payments recorded against it. Withdraw them before archiving it.');
    }
    await this.prisma.operatorPayable.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'operator_payable.archived',
      entityType: 'OperatorPayable',
      entityId: id,
      metadata: { number: payableNumber(row.reference, row.createdAt) },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.operatorPayable.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, reference: true, createdAt: true },
    });
    if (!row) throw new NotFoundException('Archived operator payable not found');
    await this.prisma.operatorPayable.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'operator_payable.restored',
      entityType: 'OperatorPayable',
      entityId: id,
      metadata: { number: payableNumber(row.reference, row.createdAt) },
    });
    return this.findOne(user, id);
  }

  /** Bills carrying live payments are skipped, and come back in `skipped`. */
  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.operatorPayable.findMany({
      where: { id: { in: ids }, deletedAt: null, payments: { none: { deletedAt: null } } },
      select: { id: true, reference: true, createdAt: true },
    });
    if (targets.length) {
      await this.prisma.operatorPayable.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'operator_payable.bulk_archived',
        entityType: 'OperatorPayable',
        metadata: { count: targets.length, numbers: targets.map((row) => payableNumber(row.reference, row.createdAt)) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.operatorPayable.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, reference: true, createdAt: true },
    });
    if (targets.length) {
      await this.prisma.operatorPayable.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'operator_payable.bulk_restored',
        entityType: 'OperatorPayable',
        metadata: { count: targets.length, numbers: targets.map((row) => payableNumber(row.reference, row.createdAt)) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  // ---- Payments -----------------------------------------------------------

  private assertTakesPayments(status: OperatorPayableStatus): void {
    if (status === OperatorPayableStatus.CANCELLED) {
      throw new BadRequestException('A cancelled bill cannot take payments.');
    }
  }

  private assertFits(total: number, otherPaid: number, amount: number): void {
    const problem = paymentProblem(total, otherPaid, amount);
    if (problem) throw new BadRequestException(problem);
  }

  private async findPayment(payableId: string, paymentId: string, archived: boolean) {
    const row = await this.prisma.operatorPayablePayment.findFirst({
      where: { id: paymentId, payableId, deletedAt: archived ? { not: null } : null },
      select: { id: true, amount: true },
    });
    if (!row) throw new NotFoundException(archived ? 'Withdrawn payment not found' : 'Payment not found');
    return row;
  }

  private async touch(user: AuthenticatedUser, payableId: string, action: string, metadata: Record<string, unknown>) {
    await this.prisma.operatorPayable.update({ where: { id: payableId }, data: { updatedById: user.id } });
    await this.audit.record({ actorId: user.id, action, entityType: 'OperatorPayable', entityId: payableId, metadata });
  }

  async recordPayment(user: AuthenticatedUser, payableId: string, dto: CreatePaymentInput) {
    const payable = await this.findLive(user, payableId);
    this.assertTakesPayments(payable.status);
    this.assertFits(toCents(payable.amount), paidCents(payable.payments), toCents(dto.amount));

    const payment = await this.prisma.operatorPayablePayment.create({
      data: {
        payableId,
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
    await this.touch(user, payableId, 'operator_payable.payment_recorded', {
      number: payableNumber(payable.reference, payable.createdAt),
      paymentId: payment.id,
      amount: dto.amount,
      method: dto.method,
    });
    return this.findOne(user, payableId);
  }

  async updatePayment(user: AuthenticatedUser, payableId: string, paymentId: string, dto: UpdatePaymentInput) {
    const payable = await this.findLive(user, payableId);
    const payment = await this.findPayment(payableId, paymentId, false);
    if (dto.amount !== undefined) {
      // Against the bill *without* this payment, or raising it by a cent is
      // checked against a total that still contains its old value.
      const others = paidCents(payable.payments) - toCents(payment.amount);
      this.assertFits(toCents(payable.amount), others, toCents(dto.amount));
    }

    await this.prisma.operatorPayablePayment.update({
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
    await this.touch(user, payableId, 'operator_payable.payment_updated', {
      number: payableNumber(payable.reference, payable.createdAt),
      paymentId,
      fields: Object.keys(dto),
    });
    return this.findOne(user, payableId);
  }

  async withdrawPayment(user: AuthenticatedUser, payableId: string, paymentId: string) {
    const payable = await this.findLive(user, payableId);
    const payment = await this.findPayment(payableId, paymentId, false);
    await this.prisma.operatorPayablePayment.update({
      where: { id: paymentId },
      data: { ...archiveData(user.id), updatedById: user.id },
    });
    await this.touch(user, payableId, 'operator_payable.payment_withdrawn', {
      number: payableNumber(payable.reference, payable.createdAt),
      paymentId,
      amount: money(payment.amount),
    });
    return this.findOne(user, payableId);
  }

  /** Re-checked against the bill as it is now, so withdraw-and-restore cannot overpay it. */
  async restorePayment(user: AuthenticatedUser, payableId: string, paymentId: string) {
    const payable = await this.findLive(user, payableId);
    const payment = await this.findPayment(payableId, paymentId, true);
    this.assertTakesPayments(payable.status);
    this.assertFits(toCents(payable.amount), paidCents(payable.payments), toCents(payment.amount));

    await this.prisma.operatorPayablePayment.update({
      where: { id: paymentId },
      data: { ...restoreData(user.id), updatedById: user.id },
    });
    await this.touch(user, payableId, 'operator_payable.payment_restored', {
      number: payableNumber(payable.reference, payable.createdAt),
      paymentId,
      amount: money(payment.amount),
    });
    return this.findOne(user, payableId);
  }
}

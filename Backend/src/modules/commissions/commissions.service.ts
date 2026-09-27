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
  isPartner,
  scopeFor,
} from '../../common/authorization/permissions.js';
import { fromCents, toCents } from '../../common/money/cents.js';
import {
  CommissionBasis,
  CommissionRecipientType,
  CommissionStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { priceQuote } from '../quotes/quotes.pricing.js';
import { TripsService } from '../trips/trips.service.js';
import { commissionValue, estimateCommission, tally, termsProblem } from './commissions.amounts.js';
import type {
  CreateCommissionInput,
  QueryCommissionsInput,
  UpdateCommissionInput,
} from './dto/commission.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const NAME_SELECT = {
  select: { id: true, firstName: true, lastName: true, companyName: true },
} satisfies Prisma.ClientDefaultArgs;

/**
 * The trip, with exactly the inputs its profit is computed from. The inputs
 * are read here and **never returned** — the response carries the commission,
 * not the profit it was derived from (#11: the agent "sees their commission,
 * never the profit").
 */
const TRIP_SELECT = {
  select: {
    id: true,
    reference: true,
    status: true,
    departureDate: true,
    client: NAME_SELECT,
    basePrice: true,
    fetEnabled: true,
    fetRate: true,
    operatorCost: true,
    lineItems: true,
  },
} satisfies Prisma.TripDefaultArgs;

const COMMISSION_SELECT = {
  id: true,
  reference: true,
  tripId: true,
  trip: TRIP_SELECT,
  recipientType: true,
  recipientUserId: true,
  recipientUser: ACTOR_SELECT,
  recipientClientId: true,
  recipientClient: NAME_SELECT,
  recipientName: true,
  recipientCompany: true,
  referralId: true,
  referral: { select: { id: true, reference: true, clientFirstName: true, clientLastName: true } },
  brokerId: true,
  broker: ACTOR_SELECT,
  basis: true,
  percentage: true,
  amount: true,
  finalAmount: true,
  status: true,
  method: true,
  paidAt: true,
  notes: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.CommissionSelect;

type Row = Prisma.CommissionGetPayload<{ select: typeof COMMISSION_SELECT }>;
type TripInputs = Row['trip'];

const toNumber = (value: Prisma.Decimal | null) => (value === null ? null : fromCents(toCents(value)));

/** The trip's profit, computed as everywhere else — null until its cost is in. */
function profitOf(trip: Pick<TripInputs, 'basePrice' | 'fetEnabled' | 'fetRate' | 'operatorCost' | 'lineItems'>) {
  if (trip.basePrice === null) return null;
  return priceQuote({ ...trip, basePrice: trip.basePrice }).grossProfit;
}

/** A client or person as one line. */
function nameOf(person: { firstName: string; lastName: string; companyName?: string | null } | null) {
  if (!person) return null;
  const full = `${person.firstName} ${person.lastName}`.trim();
  return person.companyName ? `${full} · ${person.companyName}` : full;
}

/**
 * Commissions (scope §6.12) — and #11's Commission Center.
 *
 * Three readers, one table. An administrator or senior broker sees every
 * commission; a broker sees the ones booked against them; a referral agent
 * sees the ones paid to them, **projected down** to what #11 lets them read:
 * no desk notes, no broker, and never the trip's profit.
 */
@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trips: TripsService,
  ) {}

  // ---- Scope ------------------------------------------------------------

  private scope(user: AuthenticatedUser): Prisma.CommissionWhereInput {
    if (scopeFor(user.role, Permission.VIEW_COMMISSIONS) === Scope.ALL) return {};
    if (isPartner(user.role)) {
      return { recipientType: CommissionRecipientType.REFERRAL_AGENT, recipientUserId: user.id };
    }
    return { brokerId: user.id };
  }

  // ---- Shaping ----------------------------------------------------------

  /** The desk's view: everything, plus the computed figures. */
  private serialise(row: Row) {
    const { trip, ...rest } = row;
    const terms = {
      basis: row.basis,
      percentage: row.percentage,
      amount: row.amount,
      finalAmount: row.finalAmount,
    };
    const profit = profitOf(trip);
    return {
      ...rest,
      percentage: toNumber(row.percentage),
      amount: toNumber(row.amount),
      finalAmount: toNumber(row.finalAmount),
      estimatedAmount: estimateCommission(terms, profit),
      /** The figure that counts: final once settled, the estimate until then. */
      value: commissionValue(terms, profit),
      recipientLabel: this.recipientLabel(row),
      trip: {
        id: trip.id,
        reference: trip.reference,
        status: trip.status,
        departureDate: trip.departureDate,
        client: trip.client,
      },
    };
  }

  /**
   * The agent's view (#11's Commission Center): client/trip, trip date, the
   * structure, the estimate, the final figure, status and payment date — and
   * nothing the desk keeps to itself.
   */
  private partnerView(row: Row) {
    const full = this.serialise(row);
    const referred = row.referral
      ? `${row.referral.clientFirstName} ${row.referral.clientLastName}`.trim()
      : nameOf(row.trip.client);
    return {
      id: full.id,
      reference: full.reference,
      status: full.status,
      basis: full.basis,
      percentage: full.percentage,
      amount: full.amount,
      estimatedAmount: full.estimatedAmount,
      finalAmount: full.finalAmount,
      value: full.value,
      method: full.method,
      paidAt: full.paidAt,
      clientName: referred,
      referral: row.referral ? { id: row.referral.id, reference: row.referral.reference } : null,
      trip: {
        reference: row.trip.reference,
        status: row.trip.status,
        departureDate: row.trip.departureDate,
      },
      createdAt: full.createdAt,
    };
  }

  private view(user: AuthenticatedUser, row: Row) {
    return isPartner(user.role) ? this.partnerView(row) : this.serialise(row);
  }

  private recipientLabel(row: Row): string | null {
    switch (row.recipientType) {
      case CommissionRecipientType.REFERRAL_AGENT:
        return nameOf(row.recipientUser);
      case CommissionRecipientType.CLIENT:
        return nameOf(row.recipientClient);
      default:
        return row.recipientCompany ? `${row.recipientName} · ${row.recipientCompany}` : row.recipientName;
    }
  }

  // ---- Reads ------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryCommissionsInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const partner = isPartner(user.role);
    const where: Prisma.CommissionWhereInput = {
      AND: [
        // An agent has no Archived tab: a withdrawn commission is not theirs to read.
        archiveFilter(partner ? false : query.archived),
        this.scope(user),
        equalsAny(query, ['status', 'recipientType', 'tripId', 'referralId', 'recipientUserId', 'brokerId']),
        query.search ? this.searchWhere(query.search) : {},
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        skip,
        take,
        orderBy:
          query.sortBy === 'paidAt'
            ? [{ paidAt: { sort: query.sortOrder, nulls: 'last' } }, { reference: 'desc' }]
            : orderByField(query.sortBy, query.sortOrder),
        select: COMMISSION_SELECT,
      }),
      this.prisma.commission.count({ where }),
    ]);

    return paginate(rows.map((row) => this.view(user, row)), total, query.page, query.limit);
  }

  /** "COM-1001", the trip ("TJ-1048"), the payee and the trip's client. */
  private searchWhere(term: string): Prisma.CommissionWhereInput {
    const commission = /^COM-?(\d{1,9})$/i.exec(term)?.[1] ?? (/^\d{1,9}$/.test(term) ? term : null);
    const trip = /^TJ-?(\d{1,9})$/i.exec(term)?.[1] ?? null;
    const person = searchAcross(term, ['firstName', 'lastName']);
    return {
      OR: [
        ...(commission !== null ? [{ reference: Number(commission) }] : []),
        ...(trip !== null ? [{ trip: { reference: Number(trip) } }] : []),
        searchAcross(term, ['recipientName', 'recipientCompany']),
        { recipientUser: person },
        { recipientClient: searchAcross(term, ['firstName', 'lastName', 'companyName']) },
        { trip: { client: searchAcross(term, ['firstName', 'lastName', 'companyName']) } },
      ],
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const partner = isPartner(user.role);
    const row = await this.prisma.commission.findFirst({
      where: { id, ...this.scope(user), ...(partner ? { deletedAt: null } : {}) },
      select: COMMISSION_SELECT,
    });
    if (!row) throw new NotFoundException('Commission not found');
    return this.view(user, row);
  }

  /**
   * The tiles — pending, earned, paid, and the average — summed here, in
   * cents, from the computed values. The database cannot `SUM` a figure that
   * is derived from another table's derived profit.
   *
   * The same call answers the agent's dashboard, scoped to their own rows.
   */
  async stats(user: AuthenticatedUser) {
    const rows = await this.prisma.commission.findMany({
      where: { deletedAt: null, ...this.scope(user) },
      select: {
        status: true,
        basis: true,
        percentage: true,
        amount: true,
        finalAmount: true,
        trip: {
          select: { basePrice: true, fetEnabled: true, fetRate: true, operatorCost: true, lineItems: true },
        },
      },
    });

    const valued = rows.map((row) => ({
      status: row.status,
      value: commissionValue(row, profitOf(row.trip)),
    }));
    const totals = tally(valued);
    const valuedCount = totals.count - totals.unvalued;
    const totalCents = toCents(totals.pending) + toCents(totals.earned) + toCents(totals.paid);

    return {
      ...totals,
      total: fromCents(totalCents),
      /** Over the commissions whose value is known — never divided by the unknowable ones. */
      average: valuedCount > 0 ? fromCents(Math.round(totalCents / valuedCount)) : null,
    };
  }

  // ---- Recipient and terms ----------------------------------------------

  /** A REFERRAL_AGENT account, with the structure to copy from. */
  private async agent(id: string) {
    const agent = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        role: true,
        commissionBasis: true,
        commissionPercentage: true,
        commissionAmount: true,
      },
    });
    if (!agent || agent.role !== UserRole.REFERRAL_AGENT) {
      throw new BadRequestException('That referral agent does not exist');
    }
    return agent;
  }

  private async assertClient(id: string): Promise<void> {
    const client = await this.prisma.client.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!client) throw new BadRequestException('That client does not exist');
    if (client.deletedAt) throw new BadRequestException('That client has been archived. Restore them, or choose another.');
  }

  private async assertBroker(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const broker = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: { role: true } });
    if (!broker || broker.role === UserRole.REFERRAL_AGENT) {
      throw new BadRequestException('That broker does not exist');
    }
  }

  private async assertReferral(id: string, agentId: string | null | undefined): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: { id, deletedAt: null },
      select: { agentId: true },
    });
    if (!referral) throw new BadRequestException('That referral does not exist');
    if (agentId && referral.agentId !== agentId) {
      throw new BadRequestException('That referral was submitted by a different agent');
    }
  }

  /**
   * The recipient columns for this type, with the other two cleared — so a
   * row never names two payees.
   */
  private async recipient(
    type: CommissionRecipientType,
    dto: {
      recipientUserId?: string | null;
      recipientClientId?: string | null;
      recipientName?: string | null;
      recipientCompany?: string | null;
    },
  ) {
    switch (type) {
      case CommissionRecipientType.REFERRAL_AGENT: {
        if (!dto.recipientUserId) throw new BadRequestException('Choose the referral agent');
        const agent = await this.agent(dto.recipientUserId);
        return {
          agent,
          columns: { recipientType: type, recipientUserId: agent.id, recipientClientId: null, recipientName: null, recipientCompany: null },
        };
      }
      case CommissionRecipientType.CLIENT: {
        if (!dto.recipientClientId) throw new BadRequestException('Choose the client');
        await this.assertClient(dto.recipientClientId);
        return {
          agent: null,
          columns: { recipientType: type, recipientUserId: null, recipientClientId: dto.recipientClientId, recipientName: null, recipientCompany: null },
        };
      }
      default: {
        if (!dto.recipientName) throw new BadRequestException('Name who is being paid');
        return {
          agent: null,
          columns: {
            recipientType: type,
            recipientUserId: null,
            recipientClientId: null,
            recipientName: dto.recipientName,
            recipientCompany: dto.recipientCompany ?? null,
          },
        };
      }
    }
  }

  /** Paid means a day it was paid; any other status has none. */
  private paidAtFor(status: CommissionStatus, paidAt: Date | null | undefined, current: Date | null = null) {
    if (status !== CommissionStatus.PAID) return null;
    if (paidAt) return paidAt;
    if (current) return current;
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  // ---- Writes -----------------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateCommissionInput) {
    const trip = await this.trips.commissionTarget(dto.tripId);
    const { agent, columns } = await this.recipient(dto.recipientType, dto);
    if (dto.referralId) await this.assertReferral(dto.referralId, columns.recipientUserId);
    await this.assertBroker(dto.brokerId);

    // No basis sent: a referral agent's standing structure, copied now so a
    // later change to it does not rewrite this agreement.
    const terms = dto.basis
      ? { basis: dto.basis, percentage: dto.percentage ?? null, amount: dto.amount ?? null }
      : agent?.commissionBasis
        ? { basis: agent.commissionBasis, percentage: agent.commissionPercentage, amount: agent.commissionAmount }
        : null;
    if (!terms) {
      throw new BadRequestException(
        agent
          ? 'This agent has no commission structure on file. Choose how this commission is worked out.'
          : 'Choose how this commission is worked out.',
      );
    }
    const problem = termsProblem(terms);
    if (problem) throw new BadRequestException(problem);

    const created = await this.prisma.commission.create({
      data: {
        tripId: trip.id,
        ...columns,
        referralId: dto.referralId ?? null,
        brokerId: dto.brokerId === undefined ? trip.assignedBrokerId : dto.brokerId,
        ...terms,
        finalAmount: dto.finalAmount ?? null,
        status: dto.status,
        method: dto.method ?? null,
        paidAt: this.paidAtFor(dto.status, dto.paidAt),
        notes: dto.notes ?? null,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true, reference: true },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'commission.created',
      entityType: 'Commission',
      entityId: created.id,
      metadata: { reference: created.reference, tripReference: trip.reference, recipientType: dto.recipientType },
    });

    return this.findOne(user, created.id);
  }

  /**
   * Raised by the referrals module when a referral books a trip (#11), with
   * the agent's standing structure. Returns without doing anything when the
   * agent has no structure on file — the desk then raises it by hand — or
   * when this referral already carries a live commission.
   *
   * A system action on the desk user's behalf: the caller linked the trip,
   * and the commission is the consequence of that, not a separate decision.
   */
  async raiseForReferral(
    user: AuthenticatedUser,
    referral: { id: string; reference: number; agentId: string; tripId: string; brokerId: string | null },
  ): Promise<void> {
    const [agent, existing] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: referral.agentId },
        select: { commissionBasis: true, commissionPercentage: true, commissionAmount: true },
      }),
      this.prisma.commission.findFirst({
        where: { referralId: referral.id, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (existing || !agent?.commissionBasis) return;

    const terms = { basis: agent.commissionBasis, percentage: agent.commissionPercentage, amount: agent.commissionAmount };
    // CUSTOM has no standing figure: it is agreed per referral, by hand.
    if (terms.basis === CommissionBasis.CUSTOM || termsProblem(terms)) return;

    const created = await this.prisma.commission.create({
      data: {
        tripId: referral.tripId,
        recipientType: CommissionRecipientType.REFERRAL_AGENT,
        recipientUserId: referral.agentId,
        referralId: referral.id,
        brokerId: referral.brokerId,
        ...terms,
        status: CommissionStatus.PENDING,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true, reference: true },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'commission.raised_for_referral',
      entityType: 'Commission',
      entityId: created.id,
      metadata: { reference: created.reference, referralReference: referral.reference },
    });
  }

  private async findLive(id: string) {
    const row = await this.prisma.commission.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        reference: true,
        tripId: true,
        recipientType: true,
        recipientUserId: true,
        recipientClientId: true,
        recipientName: true,
        recipientCompany: true,
        referralId: true,
        brokerId: true,
        basis: true,
        percentage: true,
        amount: true,
        status: true,
        paidAt: true,
      },
    });
    if (!row) throw new NotFoundException('Commission not found');
    return row;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCommissionInput) {
    const current = await this.findLive(id);

    if (dto.tripId && dto.tripId !== current.tripId) await this.trips.commissionTarget(dto.tripId);

    // Recipient: re-resolved only when something about it is sent.
    const recipientTouched =
      dto.recipientType !== undefined ||
      dto.recipientUserId !== undefined ||
      dto.recipientClientId !== undefined ||
      dto.recipientName !== undefined ||
      dto.recipientCompany !== undefined;
    const recipient = recipientTouched
      ? await this.recipient(dto.recipientType ?? current.recipientType, {
          recipientUserId: dto.recipientUserId === undefined ? current.recipientUserId : dto.recipientUserId,
          recipientClientId: dto.recipientClientId === undefined ? current.recipientClientId : dto.recipientClientId,
          recipientName: dto.recipientName === undefined ? current.recipientName : dto.recipientName,
          recipientCompany: dto.recipientCompany === undefined ? current.recipientCompany : dto.recipientCompany,
        })
      : null;

    const agentId = recipient ? recipient.columns.recipientUserId : current.recipientUserId;
    if (dto.referralId && dto.referralId !== current.referralId) await this.assertReferral(dto.referralId, agentId);
    if (dto.brokerId !== undefined && dto.brokerId !== current.brokerId) await this.assertBroker(dto.brokerId);

    // Terms: the basis decides which figure applies, so a basis change clears
    // the figure it no longer uses rather than leaving it behind.
    const basis = dto.basis ?? current.basis;
    const terms = {
      basis,
      percentage:
        basis === CommissionBasis.PERCENT_OF_PROFIT
          ? (dto.percentage === undefined ? current.percentage : dto.percentage)
          : null,
      amount:
        basis === CommissionBasis.PERCENT_OF_PROFIT
          ? null
          : (dto.amount === undefined ? current.amount : dto.amount),
    };
    const problem = termsProblem(terms);
    if (problem) throw new BadRequestException(problem);

    const status = dto.status ?? current.status;
    // The plain columns, named — the recipient and the terms are written from
    // their validated forms above, never as sent.
    const fields = {
      ...(dto.tripId !== undefined ? { tripId: dto.tripId } : {}),
      ...(dto.referralId !== undefined ? { referralId: dto.referralId } : {}),
      ...(dto.brokerId !== undefined ? { brokerId: dto.brokerId } : {}),
      ...(dto.finalAmount !== undefined ? { finalAmount: dto.finalAmount } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.method !== undefined ? { method: dto.method } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    };

    await this.prisma.commission.update({
      where: { id },
      data: {
        ...fields,
        ...(recipient ? recipient.columns : {}),
        ...terms,
        paidAt: this.paidAtFor(status, dto.paidAt, current.paidAt),
        updatedById: user.id,
      },
    });

    await this.audit.record({
      actorId: user.id,
      action: dto.status && dto.status !== current.status ? 'commission.status_changed' : 'commission.updated',
      entityType: 'Commission',
      entityId: id,
      metadata: {
        reference: current.reference,
        fields: Object.keys(dto),
        ...(dto.status && dto.status !== current.status ? { from: current.status, to: dto.status } : {}),
      },
    });

    return this.findOne(user, id);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const row = await this.findLive(id);
    await this.prisma.commission.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'commission.archived',
      entityType: 'Commission',
      entityId: id,
      metadata: { reference: row.reference },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.commission.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, reference: true },
    });
    if (!row) throw new NotFoundException('Archived commission not found');
    await this.prisma.commission.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'commission.restored',
      entityType: 'Commission',
      entityId: id,
      metadata: { reference: row.reference },
    });
    return this.findOne(user, id);
  }

  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.commission.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, reference: true },
    });
    if (targets.length) {
      await this.prisma.commission.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'commission.bulk_archived',
        entityType: 'Commission',
        metadata: { count: targets.length, references: targets.map((row) => row.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.commission.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, reference: true },
    });
    if (targets.length) {
      await this.prisma.commission.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'commission.bulk_restored',
        entityType: 'Commission',
        metadata: { count: targets.length, references: targets.map((row) => row.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }
}

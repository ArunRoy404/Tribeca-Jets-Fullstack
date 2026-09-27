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
import { fromCents, toCents } from '../../common/money/cents.js';
import { EmptyLegStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';
import {
  OPEN_STATUSES,
  effectiveStatus,
  matchCounts,
  matchesFor,
} from './empty-legs.matching.js';
import type {
  CreateEmptyLegInput,
  QueryEmptyLegsInput,
  UpdateEmptyLegInput,
} from './dto/empty-leg.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const AIRPORT_SELECT = {
  select: { id: true, icao: true, iata: true, name: true, city: true, country: true },
} satisfies Prisma.AirportDefaultArgs;

/** Explicit select, never a bare row spread — see the users module for why. */
const EMPTY_LEG_LIST_SELECT = {
  id: true,
  reference: true,
  originAirportId: true,
  originAirport: AIRPORT_SELECT,
  destinationAirportId: true,
  destinationAirport: AIRPORT_SELECT,
  departureDate: true,
  departureTime: true,
  expiresAt: true,
  operatorId: true,
  operator: { select: { id: true, name: true } },
  aircraftId: true,
  aircraft: { select: { id: true, tailNumber: true, model: true, category: true } },
  aircraftDescription: true,
  seats: true,
  price: true,
  status: true,
  notes: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.EmptyLegSelect;

const EMPTY_LEG_DETAIL_SELECT = {
  ...EMPTY_LEG_LIST_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.EmptyLegSelect;

type ListRow = Prisma.EmptyLegGetPayload<{ select: typeof EMPTY_LEG_LIST_SELECT }>;

const toNumber = (value: Prisma.Decimal | null) => (value === null ? null : Number(value));

/**
 * Empty Legs (scope §6.13), built for client adjustment #10b.
 *
 * Shared inventory: an operator's empty leg belongs to the whole desk, not to
 * a broker, so there is no row-level scope on the legs themselves. What *is*
 * scoped is the match list — it is made of trip requests, and it goes through
 * `TripRequestsService`, which shows a broker only the enquiries they may
 * already see.
 */
@Injectable()
export class EmptyLegsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly requests: TripRequestsService,
  ) {}

  // ---- Shaping ----------------------------------------------------------

  private serialise<T extends ListRow>(row: T, now: Date) {
    const status = effectiveStatus(row.status, row.expiresAt, now);
    return {
      ...row,
      price: toNumber(row.price),
      /** As the desk should read it — an open leg past its expiry is EXPIRED. */
      status,
      /** What someone last set. Differs from `status` only when the offer lapsed. */
      storedStatus: row.status,
      lapsed: status !== row.status,
    };
  }

  /**
   * The status filter, as the desk means it. "Available" must not list a leg
   * whose offer ran out this morning, and "Expired" must include it.
   */
  private statusWhere(status: EmptyLegStatus | undefined, now: Date): Prisma.EmptyLegWhereInput {
    if (!status) return {};
    const lapsed = { expiresAt: { lte: now } };
    if (status === EmptyLegStatus.EXPIRED) {
      return { OR: [{ status }, { status: { in: [...OPEN_STATUSES] }, ...lapsed }] };
    }
    if ((OPEN_STATUSES as readonly EmptyLegStatus[]).includes(status)) {
      return { status, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    }
    return { status };
  }

  // ---- Link checks ------------------------------------------------------

  private async assertAirport(id: string, label: string): Promise<void> {
    const row = await this.prisma.airport.findUnique({ where: { id }, select: { deletedAt: true, icao: true } });
    if (!row) throw new BadRequestException(`That ${label} airport does not exist`);
    if (row.deletedAt) {
      throw new BadRequestException(`${row.icao} has been archived. Restore it, or choose another airport.`);
    }
  }

  private async assertOperator(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const row = await this.prisma.operator.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!row) throw new BadRequestException('That operator does not exist');
    if (row.deletedAt) throw new BadRequestException('That operator has been archived. Restore it, or choose another.');
  }

  private async assertAircraft(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const row = await this.prisma.aircraft.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!row) throw new BadRequestException('That aircraft does not exist');
    if (row.deletedAt) throw new BadRequestException('That aircraft has been archived. Restore it, or choose another.');
  }

  // ---- Reads ------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryEmptyLegsInput): Promise<Paginated<unknown>> {
    const now = new Date();
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.EmptyLegWhereInput = {
      AND: [
        archiveFilter(query.archived),
        equalsAny(query, ['originAirportId', 'destinationAirportId', 'operatorId']),
        this.statusWhere(query.status, now),
        query.search ? this.searchWhere(query.search) : {},
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.emptyLeg.findMany({
        where,
        skip,
        take,
        orderBy:
          query.sortBy === 'expiresAt' || query.sortBy === 'price'
            ? [{ [query.sortBy]: { sort: query.sortOrder, nulls: 'last' } }, { reference: 'desc' }]
            : orderByField(query.sortBy, query.sortOrder),
        select: EMPTY_LEG_LIST_SELECT,
      }),
      this.prisma.emptyLeg.count({ where }),
    ]);

    // One read of the page's routes, counted per leg — never a query per row.
    const candidates = await this.requests.onRoutes(user, rows);
    return paginate(
      rows.map((row) => ({ ...this.serialise(row, now), ...matchCounts(row, candidates) })),
      total,
      query.page,
      query.limit,
    );
  }

  /** "EL-1001" or "1001", the airports by code, name or city, the operator and the tail. */
  private searchWhere(term: string): Prisma.EmptyLegWhereInput {
    const digits = term.replace(/^EL-?/i, '');
    const reference = /^\d{1,9}$/.test(digits) ? Number(digits) : null;
    const airport = searchAcross(term, ['icao', 'iata', 'name', 'city']);
    return {
      OR: [
        ...(reference !== null ? [{ reference }] : []),
        { originAirport: airport },
        { destinationAirport: airport },
        { operator: searchAcross(term, ['name']) },
        { aircraft: searchAcross(term, ['tailNumber', 'model']) },
        searchAcross(term, ['aircraftDescription']),
      ],
    };
  }

  /**
   * One leg with its matches — #10b's list of people to call. Archived legs
   * load too; the Archived tab links here.
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.emptyLeg.findUnique({ where: { id }, select: EMPTY_LEG_DETAIL_SELECT });
    if (!row) throw new NotFoundException('Empty leg not found');

    const now = new Date();
    const candidates = await this.requests.onRoutes(user, [row]);
    const matches = matchesFor(row, candidates).map(({ request, dayGap, dateMatch }) => ({
      ...request,
      archived: request.deletedAt !== null,
      dayGap,
      dateMatch,
    }));

    return {
      ...this.serialise(row, now),
      matchCount: matches.length,
      dateMatchCount: matches.filter((match) => match.dateMatch).length,
      matches,
    };
  }

  /**
   * The tiles above the board. Total value is summed here from the priced
   * open legs, and says how many had a price — a sum silently missing half
   * the legs reads as a quiet week.
   */
  async stats() {
    const now = new Date();
    const live = { deletedAt: null };
    const [available, matched, booked, expired, priced] = await Promise.all([
      this.prisma.emptyLeg.count({ where: { ...live, ...this.statusWhere(EmptyLegStatus.AVAILABLE, now) } }),
      this.prisma.emptyLeg.count({ where: { ...live, ...this.statusWhere(EmptyLegStatus.MATCHED, now) } }),
      this.prisma.emptyLeg.count({ where: { ...live, status: EmptyLegStatus.BOOKED } }),
      this.prisma.emptyLeg.count({ where: { ...live, ...this.statusWhere(EmptyLegStatus.EXPIRED, now) } }),
      this.prisma.emptyLeg.findMany({
        where: {
          ...live,
          status: { in: [...OPEN_STATUSES] },
          price: { not: null },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { price: true },
      }),
    ]);

    const cents = priced.reduce((sum, row) => sum + toCents(row.price), 0);
    return {
      available,
      matched,
      booked,
      expired,
      openValue: fromCents(cents),
      pricedOpenCount: priced.length,
    };
  }

  // ---- Writes -----------------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateEmptyLegInput) {
    await Promise.all([
      this.assertAirport(dto.originAirportId, 'departure'),
      this.assertAirport(dto.destinationAirportId, 'arrival'),
      this.assertOperator(dto.operatorId),
      this.assertAircraft(dto.aircraftId),
    ]);

    const leg = await this.prisma.emptyLeg.create({
      data: { ...dto, createdById: user.id, updatedById: user.id },
      select: { id: true, reference: true },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'empty_leg.created',
      entityType: 'EmptyLeg',
      entityId: leg.id,
      metadata: { reference: leg.reference },
    });

    return this.findOne(user, leg.id);
  }

  private async findLive(id: string) {
    const row = await this.prisma.emptyLeg.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        reference: true,
        status: true,
        originAirportId: true,
        destinationAirportId: true,
        operatorId: true,
        aircraftId: true,
      },
    });
    if (!row) throw new NotFoundException('Empty leg not found');
    return row;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEmptyLegInput) {
    const current = await this.findLive(id);

    const origin = dto.originAirportId ?? current.originAirportId;
    const destination = dto.destinationAirportId ?? current.destinationAirportId;
    if (origin === destination) {
      throw new BadRequestException('An empty leg cannot depart and arrive at the same airport');
    }

    // Only links that actually change are checked — AGENTS.md.
    if (dto.originAirportId && dto.originAirportId !== current.originAirportId) {
      await this.assertAirport(dto.originAirportId, 'departure');
    }
    if (dto.destinationAirportId && dto.destinationAirportId !== current.destinationAirportId) {
      await this.assertAirport(dto.destinationAirportId, 'arrival');
    }
    if (dto.operatorId !== undefined && dto.operatorId !== current.operatorId) await this.assertOperator(dto.operatorId);
    if (dto.aircraftId !== undefined && dto.aircraftId !== current.aircraftId) await this.assertAircraft(dto.aircraftId);

    await this.prisma.emptyLeg.update({ where: { id }, data: { ...dto, updatedById: user.id } });

    await this.audit.record({
      actorId: user.id,
      action: dto.status && dto.status !== current.status ? 'empty_leg.status_changed' : 'empty_leg.updated',
      entityType: 'EmptyLeg',
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
    const leg = await this.findLive(id);
    await this.prisma.emptyLeg.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'empty_leg.archived',
      entityType: 'EmptyLeg',
      entityId: id,
      metadata: { reference: leg.reference },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    const leg = await this.prisma.emptyLeg.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, reference: true },
    });
    if (!leg) throw new NotFoundException('Archived empty leg not found');
    await this.prisma.emptyLeg.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'empty_leg.restored',
      entityType: 'EmptyLeg',
      entityId: id,
      metadata: { reference: leg.reference },
    });
    return this.findOne(user, id);
  }

  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.emptyLeg.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, reference: true },
    });
    if (targets.length) {
      await this.prisma.emptyLeg.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'empty_leg.bulk_archived',
        entityType: 'EmptyLeg',
        metadata: { count: targets.length, references: targets.map((row) => row.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.emptyLeg.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, reference: true },
    });
    if (targets.length) {
      await this.prisma.emptyLeg.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'empty_leg.bulk_restored',
        entityType: 'EmptyLeg',
        metadata: { count: targets.length, references: targets.map((row) => row.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }
}

import {
  BadRequestException,
  ConflictException,
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
} from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import { AircraftStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateAircraftInput,
  QueryAircraftInput,
  UpdateAircraftInput,
} from './dto/aircraft.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

/**
 * The operator and home base come back as rows, not names.
 *
 * The table renders "VistaJet" and "Zurich (LSZH)" as links, so it needs the
 * id alongside the label — and reading the label off the related row is what
 * stops the fleet showing a stale operator name after the operator is renamed.
 */
const OPERATOR_SELECT = {
  select: { id: true, name: true, status: true, deletedAt: true },
} satisfies Prisma.OperatorDefaultArgs;

const HOME_BASE_SELECT = {
  select: { id: true, icao: true, iata: true, name: true, city: true },
} satisfies Prisma.AirportDefaultArgs;

/** Explicit select, never a bare row spread — see the users module for why. */
const AIRCRAFT_SELECT = {
  id: true,
  tailNumber: true,
  model: true,
  manufacturer: true,
  category: true,
  status: true,
  operatorId: true,
  operator: OPERATOR_SELECT,
  homeBaseId: true,
  homeBase: HOME_BASE_SELECT,
  maxPassengers: true,
  rangeNm: true,
  yearBuilt: true,
  maxSpeed: true,
  cruiseSpeed: true,
  serviceCeilingFt: true,
  baggageCapacityCuFt: true,
  cabinLengthFt: true,
  maxTakeoffWeightLb: true,
  emptyWeightLb: true,
  fuelCapacityGal: true,
  takeoffDistanceFt: true,
  landingDistanceFt: true,
  amenities: true,
  lastInspectionAt: true,
  lastAnnualAt: true,
  nextInspectionDueAt: true,
  notes: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  // The actors come back on the *list*, not just the detail: the Archived tab
  // has "Removed By" as a column, and the restored badge names who undid it.
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.AircraftSelect;

const AIRCRAFT_DETAIL_SELECT = {
  ...AIRCRAFT_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.AircraftSelect;

/**
 * Columns the UI shows that nothing can supply yet.
 *
 * All three are aggregates over trips, which do not exist. Null rather than 0,
 * because a confident "0 trips" against a tail the desk has flown twelve times
 * is a wrong answer and null lets the UI render an honest em dash. They become
 * real counts when the Trips module lands — see AGENTS.md on build order.
 */
const UNAVAILABLE_AGGREGATES = {
  totalTrips: null,
  tripsThisYear: null,
  avgUtilization: null,
} as const;

type AircraftRow = { cabinLengthFt: Prisma.Decimal | null };

/**
 * Case-insensitive search across the fleet, including the operator's name.
 *
 * Not `searchAcross`, which only reaches flat columns: "VistaJet" is the
 * obvious thing to type into a fleet search and it lives on the related row.
 * Module-private for now — lift it into `common/database/filters.ts` the
 * moment a second module needs to search through a relation, rather than
 * writing this shape twice.
 */
function fleetSearch(term: string | undefined): Prisma.AircraftWhereInput {
  if (!term) return {};
  const contains = { contains: term, mode: 'insensitive' } as const;
  return {
    OR: [
      { tailNumber: contains },
      { model: contains },
      { manufacturer: contains },
      { operator: { name: contains } },
      { homeBase: { icao: contains } },
      { homeBase: { name: contains } },
      { homeBase: { city: contains } },
    ],
  };
}

@Injectable()
export class AircraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * `cabinLengthFt` is a Prisma Decimal, which serialises to a string.
   * The Specifications tab formats it as a number, so it is converted here
   * rather than in every caller — the same treatment airports give latitude.
   */
  private serialise<T extends AircraftRow>(row: T) {
    return {
      ...row,
      cabinLengthFt:
        row.cabinLengthFt === null ? null : Number(row.cabinLengthFt),
      ...UNAVAILABLE_AGGREGATES,
    };
  }

  /**
   * Rejects an operator or airport the caller cannot actually assign.
   *
   * The foreign key alone would answer with a bare P2003 and, worse, would
   * happily accept an *archived* operator: the row still exists, so the
   * constraint is satisfied while the desk has said that company is out of
   * service. Checking here gives the form a named 400 instead.
   */
  private async assertOperator(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!operator) {
      throw new BadRequestException('That operator does not exist');
    }
    // Archived is not the same as missing, and saying so is the difference
    // between "I mistyped an id" and "someone archived that company".
    if (operator.deletedAt) {
      throw new BadRequestException(
        'That operator has been archived. Restore it, or choose another.',
      );
    }
  }

  private async assertHomeBase(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const airport = await this.prisma.airport.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!airport) {
      throw new BadRequestException('That home base airport does not exist');
    }
    if (airport.deletedAt) {
      throw new BadRequestException(
        'That home base airport has been archived. Restore it, or choose another.',
      );
    }
  }

  /**
   * A registration identifies one airframe worldwide, so it is unique across
   * the table — archived rows included. An archived tail holding its
   * registration is the common case (the aircraft left the fleet and came
   * back), so the conflict says where to find it rather than just refusing.
   */
  private async assertTailAvailable(tailNumber: string): Promise<void> {
    const existing = await this.prisma.aircraft.findUnique({
      where: { tailNumber },
      select: { id: true, deletedAt: true },
    });
    if (!existing) return;

    throw new ConflictException(
      existing.deletedAt
        ? `${tailNumber} belongs to an archived aircraft. Restore it from the Archived tab instead of creating a duplicate.`
        : `An aircraft with tail number ${tailNumber} already exists`,
    );
  }

  // The caller is not read here: the fleet is master data, the same rows for
  // everyone signed in, and the guard has already settled access.
  async findAll(query: QueryAircraftInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.AircraftWhereInput = {
      // One endpoint serves the table and its Archived tab; a separate
      // /archived route would duplicate every filter and sort param.
      ...archiveFilter(query.archived),
      ...equalsAny(query, ['status', 'category', 'operatorId', 'homeBaseId']),
      ...fleetSearch(query.search),
      // The fleet finder (scope §6.8). `gte`, not equals: an aircraft with
      // more seats or more range still answers "what can carry nine people to
      // Aspen". A null figure fails the comparison in Postgres and the row
      // drops out, which is the honest result — an unknown capacity is not a
      // capacity, and quoting against a guess is how someone gets left behind.
      ...(query.minPassengers !== undefined
        ? { maxPassengers: { gte: query.minPassengers } }
        : {}),
      ...(query.minRangeNm !== undefined
        ? { rangeNm: { gte: query.minRangeNm } }
        : {}),
      // Every listed preference, not any of them: a requested cabin feature is
      // a requirement, so an aircraft missing one is a wrong answer.
      ...(query.amenities?.length ? { amenities: { hasEvery: query.amenities } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aircraft.findMany({
        where,
        select: AIRCRAFT_SELECT,
        // `sortBy` is narrowed to AIRCRAFT_SORTABLE_FIELDS by the DTO.
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.aircraft.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.serialise(row)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Archived rows included, deliberately — the Archived tab links straight
   * here, so filtering them out would list a row and then 404 it. The payload
   * carries the archive trail, so the page can offer Restore rather than
   * pretending the aircraft is live.
   */
  async findOne(id: string) {
    const row = await this.prisma.aircraft.findFirst({
      where: { id },
      select: AIRCRAFT_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Aircraft not found');

    return {
      ...this.serialise(row),
      // The detail page's Trips tab reads this. An empty array rather than an
      // omitted key, so the tab renders its own empty state instead of
      // crashing on undefined.
      tripHistory: [],
    };
  }

  /**
   * One operator's fleet, for the operator detail page's Fleet tab.
   *
   * Lives here rather than in the operators service because this module owns
   * the table: a raw `prisma.aircraft` query from over there would be a second
   * place deciding what "this operator's fleet" means, and the two would
   * disagree the first time archived tails needed excluding.
   *
   * Unpaginated on purpose, and the only place in the API that is. A fleet is
   * a handful of tails inside a detail payload that is already one request;
   * `take` caps it so a pathological operator cannot return unbounded rows,
   * and if a real fleet ever approaches that cap the tab gets its own paged
   * call to `GET /aircraft?operatorId=`, which already exists.
   */
  async listForOperator(operatorId: string) {
    const rows = await this.prisma.aircraft.findMany({
      where: { operatorId, deletedAt: null },
      select: AIRCRAFT_SELECT,
      orderBy: { tailNumber: 'asc' },
      take: 100,
    });
    return rows.map((row) => this.serialise(row));
  }

  /** Every live aircraft across the fleet, for the operators stats tile. */
  async countAll(): Promise<number> {
    return this.prisma.aircraft.count({ where: { deletedAt: null } });
  }

  /**
   * Every cabin feature actually recorded on a live aircraft, de-duplicated.
   *
   * Derived from the rows rather than a list fixed at design time, exactly as
   * the airports module derives its country filter: a hardcoded list offers
   * options nothing matches and omits whatever someone typed yesterday.
   *
   * `amenities` is a Postgres array, so the distinct values cannot come from
   * `distinct:` — the flattening happens here. The fleet is small enough that
   * reading the column and reducing it beats a raw `unnest` query, and it
   * keeps this on the same Prisma path as everything else in the service.
   */
  async amenities(): Promise<string[]> {
    const rows = await this.prisma.aircraft.findMany({
      where: { deletedAt: null },
      select: { amenities: true },
    });

    const seen = new Map<string, string>();
    for (const row of rows) {
      for (const amenity of row.amenities) {
        // Case-insensitive de-duplication, first spelling wins: "WiFi" and
        // "Wifi" are one preference typed twice, and offering both in a
        // dropdown splits the fleet in half for no reason.
        const key = amenity.toLowerCase();
        if (!seen.has(key)) seen.set(key, amenity);
      }
    }

    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }

  /** The four tiles above the aircraft table. */
  async stats() {
    const where: Prisma.AircraftWhereInput = { deletedAt: null };

    const [total, available, inService, maintenance] =
      await this.prisma.$transaction([
        this.prisma.aircraft.count({ where }),
        this.prisma.aircraft.count({
          where: { ...where, status: AircraftStatus.AVAILABLE },
        }),
        this.prisma.aircraft.count({
          where: { ...where, status: AircraftStatus.IN_SERVICE },
        }),
        this.prisma.aircraft.count({
          where: { ...where, status: AircraftStatus.MAINTENANCE },
        }),
      ]);

    return {
      total,
      available,
      inService,
      maintenance,
      inactive: total - available - inService - maintenance,
    };
  }

  async create(actor: AuthenticatedUser, dto: CreateAircraftInput) {
    await this.assertTailAvailable(dto.tailNumber);
    await this.assertOperator(dto.operatorId);
    await this.assertHomeBase(dto.homeBaseId);

    const aircraft = await this.prisma.aircraft.create({
      data: { ...dto, createdById: actor.id, updatedById: actor.id },
      select: AIRCRAFT_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'aircraft.created',
      entityType: 'Aircraft',
      entityId: aircraft.id,
      metadata: {
        tailNumber: aircraft.tailNumber,
        model: aircraft.model,
        status: aircraft.status,
      },
    });

    return this.serialise(aircraft);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateAircraftInput) {
    const target = await this.prisma.aircraft.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        tailNumber: true,
        model: true,
        status: true,
        operatorId: true,
        homeBaseId: true,
      },
    });
    if (!target) throw new NotFoundException('Aircraft not found');

    if (dto.tailNumber && dto.tailNumber !== target.tailNumber) {
      await this.assertTailAvailable(dto.tailNumber);
    }

    /**
     * Only a link that is actually *changing* is validated.
     *
     * The edit form resends every field, so re-checking unconditionally meant
     * an aircraft whose operator had since been archived could not be edited
     * at all — changing its notes returned "That operator does not exist"
     * about the operator it already had. Leaving a stale link alone is not
     * the same as assigning one.
     */
    if (dto.operatorId !== undefined && dto.operatorId !== target.operatorId) {
      await this.assertOperator(dto.operatorId);
    }
    if (dto.homeBaseId !== undefined && dto.homeBaseId !== target.homeBaseId) {
      await this.assertHomeBase(dto.homeBaseId);
    }

    const aircraft = await this.prisma.aircraft.update({
      where: { id },
      // `updatedById` comes from the session, never the request body.
      data: { ...dto, updatedById: actor.id },
      select: AIRCRAFT_SELECT,
    });

    // Record what actually changed, not the whole payload. Status is called
    // out because "who grounded this tail, and when" is the question the
    // maintenance conversation always starts with.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (dto.status && dto.status !== target.status) {
      changes.status = { from: target.status, to: dto.status };
    }
    if (dto.tailNumber && dto.tailNumber !== target.tailNumber) {
      changes.tailNumber = { from: target.tailNumber, to: dto.tailNumber };
    }

    await this.audit.record({
      actorId: actor.id,
      action: 'aircraft.updated',
      entityType: 'Aircraft',
      entityId: id,
      metadata: {
        tailNumber: target.tailNumber,
        changes,
        fields: Object.keys(dto),
      },
    });

    return this.serialise(aircraft);
  }

  /**
   * Brings an archived aircraft back, exactly as it was.
   *
   * Clears the deletion stamp and nothing else — see the airports service for
   * why a restore never re-runs the create form. The tail number needs no
   * availability check here: it stayed reserved while the row was archived,
   * which is exactly why `assertTailAvailable` points people at this endpoint.
   */
  async restore(actor: AuthenticatedUser, id: string) {
    const target = await this.prisma.aircraft.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, tailNumber: true, model: true },
    });
    if (!target) throw new NotFoundException('Archived aircraft not found');

    const aircraft = await this.prisma.aircraft.update({
      where: { id },
      data: { ...restoreData(actor.id), updatedById: actor.id },
      select: AIRCRAFT_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'aircraft.restored',
      entityType: 'Aircraft',
      entityId: id,
      metadata: { tailNumber: target.tailNumber, model: target.model },
    });

    return this.serialise(aircraft);
  }

  /**
   * Removes several aircraft at once, for the table's checkbox column.
   *
   * Soft delete like the single case — quotes and trips will point at these
   * rows. Ids matching nothing are reported as `skipped` rather than failing
   * the batch; see `bulkResult`.
   */
  async removeMany(
    actor: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    // Read first, so the audit log names what was actually removed.
    const targets = await this.prisma.aircraft.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, tailNumber: true },
    });

    if (targets.length > 0) {
      await this.prisma.aircraft.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(actor.id), updatedById: actor.id },
      });

      await this.audit.record({
        actorId: actor.id,
        action: 'aircraft.removed_bulk',
        entityType: 'Aircraft',
        entityId: null,
        metadata: {
          count: targets.length,
          aircraft: targets.map((row) => ({
            id: row.id,
            tailNumber: row.tailNumber,
          })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  /**
   * Brings several archived aircraft back at once.
   *
   * The mirror of `removeMany`, for the Archived tab's checkbox column, and it
   * follows the same two rules: read the rows first so the audit entry can name
   * them, and treat ids that match nothing as `skipped` rather than failing the
   * batch — two people restoring the same selection should both succeed.
   */
  async restoreMany(
    actor: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    const targets = await this.prisma.aircraft.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, tailNumber: true },
    });

    if (targets.length > 0) {
      await this.prisma.aircraft.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(actor.id), updatedById: actor.id },
      });

      await this.audit.record({
        actorId: actor.id,
        action: 'aircraft.restored_bulk',
        entityType: 'Aircraft',
        entityId: null,
        metadata: {
          count: targets.length,
          aircraft: targets.map((row) => ({
            id: row.id,
            tailNumber: row.tailNumber,
          })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  /**
   * Soft delete. The row stays because quotes and trips will point at it:
   * destroying an airframe would orphan the history of every flight it flew.
   *
   * Note this is not how an aircraft leaves the fleet in normal use — that is
   * `status: INACTIVE`, which keeps the tail in the list and searchable.
   * Archiving is for a row that should not have been entered at all.
   */
  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    const target = await this.prisma.aircraft.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, tailNumber: true, model: true },
    });
    if (!target) throw new NotFoundException('Aircraft not found');

    await this.prisma.aircraft.update({
      where: { id },
      data: { ...archiveData(actor.id), updatedById: actor.id },
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'aircraft.removed',
      entityType: 'Aircraft',
      entityId: id,
      metadata: { tailNumber: target.tailNumber, model: target.model },
    });
  }
}

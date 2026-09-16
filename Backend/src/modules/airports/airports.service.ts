import {
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
  searchAcross,
} from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateAirportInput,
  QueryAirportsInput,
  UpdateAirportInput,
} from './dto/airport.dto.js';

/** Explicit select, never a bare row spread — see the users module for why. */
const AIRPORT_SELECT = {
  id: true,
  icao: true,
  iata: true,
  name: true,
  city: true,
  state: true,
  country: true,
  latitude: true,
  longitude: true,
  longestRunwayFt: true,
  assignedFbo: true,
  notes: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  // The actors come back on the *list*, not just the detail: the Archived tab
  // has "Removed By" as a column, and the restored badge names who undid it.
  // Two joins per row on a page capped at 100 is the cheaper half of the trade
  // against a second request per row to resolve the names.
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.AirportSelect;

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const AIRPORT_DETAIL_SELECT = {
  ...AIRPORT_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.AirportSelect;

/**
 * The stats row splits the list into domestic and international, which only
 * means anything relative to a home country. The desk is US-based, so this is
 * that assumption written down in one place rather than assumed in three.
 */
const HOME_COUNTRY = 'USA';

type AirportRow = Prisma.AirportGetPayload<{ select: typeof AIRPORT_SELECT }>;

@Injectable()
export class AirportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Prisma returns Decimal objects for the coordinate columns, which serialise
   * as `{ s, e, d }` through JSON. Converting here keeps every caller — the
   * list, the detail, and whatever reads them next — from having to know that.
   */
  private serialise(row: AirportRow) {
    return {
      ...row,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
    };
  }

  // The caller is not read here: reference data is the same rows for
  // everyone signed in, and the guard has already settled access.
  async findAll(query: QueryAirportsInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.AirportWhereInput = {
      // One endpoint serves the table and its Archived tab; a separate
      // /archived route would duplicate every filter and sort param.
      ...archiveFilter(query.archived),
      ...equalsAny(query, ['country']),
      ...searchAcross(query.search, ['icao', 'iata', 'name', 'city', 'country']),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.airport.findMany({
        where,
        select: AIRPORT_SELECT,
        // `sortBy` is narrowed to AIRPORT_SORTABLE_FIELDS by the DTO.
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.airport.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.serialise(row)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Archived rows included, deliberately — see the note on the operators
   * equivalent. The Archived tab links here, so excluding them turned every
   * archived airport's detail into a 404.
   */
  async findOne(id: string) {
    const row = await this.prisma.airport.findFirst({
      where: { id },
      select: AIRPORT_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Airport not found');
    return this.serialise(row as AirportRow);
  }

  /** The four tiles above the airports table. */
  async stats() {
    const where: Prisma.AirportWhereInput = { deletedAt: null };

    const [total, domestic, withFbo] = await this.prisma.$transaction([
      this.prisma.airport.count({ where }),
      this.prisma.airport.count({ where: { ...where, country: HOME_COUNTRY } }),
      // An empty string is not an assigned FBO. Checking only for null would
      // count a row someone saved with the field blank.
      this.prisma.airport.count({
        where: { ...where, NOT: { assignedFbo: null }, assignedFbo: { not: '' } },
      }),
    ]);

    return {
      total,
      domestic,
      international: total - domestic,
      withAssignedFbo: withFbo,
      homeCountry: HOME_COUNTRY,
    };
  }

  /**
   * The country filter's options.
   *
   * Served from the data rather than a hardcoded list in the UI: the dropdown
   * previously offered five countries chosen at design time, which is wrong the
   * moment anyone adds a sixth, and offers dead options if one is removed.
   */
  async countries(): Promise<string[]> {
    const rows = await this.prisma.airport.findMany({
      where: { deletedAt: null },
      distinct: ['country'],
      select: { country: true },
      orderBy: { country: 'asc' },
    });
    return rows.map((row) => row.country);
  }

  /**
   * Creates an airport. Never restores one.
   *
   * ICAO is unique across live *and* archived rows, so an archived airport
   * keeps its code. That is deliberate: there is only one LFPB in the world,
   * and two records for it would be bad data rather than a feature. It also
   * means a live row and an archived row can never share a code, which is why
   * `restore` needs no conflict check.
   *
   * Re-adding an archived code is therefore a 409 — but one that points
   * somewhere, because the airport is sitting in the Archived tab waiting to
   * be restored with all of its fields intact. Reviving it from here instead
   * would silently overwrite eleven stored fields with whatever was typed into
   * the create form, which is not what anyone means by "restore".
   */
  async create(actor: AuthenticatedUser, dto: CreateAirportInput) {
    await this.assertIcaoAvailable(dto.icao);

    const airport = await this.prisma.airport.create({
      data: { ...dto, createdById: actor.id, updatedById: actor.id },
      select: AIRPORT_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'airport.created',
      entityType: 'Airport',
      entityId: airport.id,
      metadata: { icao: airport.icao, name: airport.name },
    });

    return this.serialise(airport);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateAirportInput) {
    const target = await this.prisma.airport.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, icao: true, name: true },
    });
    if (!target) throw new NotFoundException('Airport not found');

    if (dto.icao && dto.icao !== target.icao) {
      await this.assertIcaoAvailable(dto.icao);
    }

    const airport = await this.prisma.airport.update({
      where: { id },
      // `updatedById` comes from the session; an audit column a caller can
      // supply is not an audit column.
      data: { ...dto, updatedById: actor.id },
      select: AIRPORT_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'airport.updated',
      entityType: 'Airport',
      entityId: id,
      metadata: { icao: target.icao, fields: Object.keys(dto) },
    });

    return this.serialise(airport);
  }

  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    const target = await this.prisma.airport.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, icao: true, name: true },
    });
    if (!target) throw new NotFoundException('Airport not found');

    await this.prisma.airport.update({
      where: { id },
      data: { ...archiveData(actor.id), updatedById: actor.id },
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'airport.removed',
      entityType: 'Airport',
      entityId: id,
      metadata: { icao: target.icao, name: target.name },
    });
  }

  /**
   * Removes several airports at once, for the table's checkbox column.
   *
   * One `updateMany` rather than a loop of `remove()`: a hundred round trips
   * is a hundred chances to half-finish, and the point of selecting rows is
   * that they move together.
   *
   * Ids that match nothing are reported as `skipped` rather than failing the
   * batch — see `bulkResult`.
   */
  async removeMany(
    actor: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    // Read first, so the audit log names what was actually removed. After the
    // update these rows are indistinguishable from ones deleted last week.
    const targets = await this.prisma.airport.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, icao: true, name: true },
    });

    if (targets.length > 0) {
      await this.prisma.airport.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(actor.id), updatedById: actor.id },
      });

      await this.audit.record({
        actorId: actor.id,
        action: 'airport.removed_bulk',
        entityType: 'Airport',
        // No single entity id fits a batch, so the ids live in the metadata
        // and this entry stands for the whole action.
        entityId: null,
        metadata: {
          count: targets.length,
          airports: targets.map((row) => ({ id: row.id, icao: row.icao })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  /**
   * Brings an archived airport back, exactly as it was.
   *
   * Clears the deletion stamp and nothing else — every field returns
   * untouched, which is what "restore" has to mean. Re-entering eleven fields
   * through the create form is not restoring, and that is precisely what this
   * replaces.
   *
   * No conflict check is needed on ICAO: the unique index covers archived rows
   * too, so nothing can have taken the code while this row held it. That is
   * the reason the index deliberately is *not* partial.
   */
  async restore(actor: AuthenticatedUser, id: string) {
    const target = await this.prisma.airport.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, icao: true, name: true },
    });
    // 404 for a live row as well as a missing one: "restore" is meaningless
    // for something that was never archived, and saying so would leak which
    // ids exist.
    if (!target) throw new NotFoundException('Archived airport not found');

    const airport = await this.prisma.airport.update({
      where: { id },
      data: { ...restoreData(actor.id), updatedById: actor.id },
      select: AIRPORT_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'airport.restored',
      entityType: 'Airport',
      entityId: id,
      metadata: { icao: target.icao, name: target.name },
    });

    return this.serialise(airport);
  }

  /**
   * Refuses an ICAO that is already taken, by a live row or an archived one.
   *
   * The archived case gets its own message: a bare "already exists" would point
   * at a row the caller cannot see in the table, leaving them with no next
   * step. Naming the Archived tab turns a dead end into an instruction.
   */
  private async assertIcaoAvailable(icao: string): Promise<void> {
    const existing = await this.prisma.airport.findUnique({
      where: { icao },
      select: { id: true, deletedAt: true },
    });
    if (!existing) return;

    throw new ConflictException(
      existing.deletedAt
        ? `${icao} belongs to an archived airport. Restore it from the Archived tab instead of creating a duplicate.`
        : `An airport with ICAO ${icao} already exists`,
    );
  }
}

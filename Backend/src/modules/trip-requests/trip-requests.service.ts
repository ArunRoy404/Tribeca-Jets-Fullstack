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
import { equalsAny, orderByField } from '../../common/database/filters.js';
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
import { TripRequestStatus, UserRole } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { OperatorQuotesService } from '../operator-quotes/operator-quotes.service.js';
import type {
  CreateTripRequestInput,
  QueryTripRequestsInput,
  RequestWindow,
  UpdateTripRequestInput,
} from './dto/trip-request.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const AIRPORT_SELECT = {
  select: { id: true, icao: true, iata: true, name: true, city: true },
} satisfies Prisma.AirportDefaultArgs;

/**
 * The client comes back as a row, not a name.
 *
 * The board links straight to the client, and reading the name off the
 * relation is what stops a request showing "Jonathan Reed" a week after he was
 * renamed. `type` rides along because a travel agent's enquiry is labelled
 * differently from a direct client's.
 */
const CLIENT_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    companyName: true,
    email: true,
    phone: true,
    type: true,
    status: true,
    leadStage: true,
    priority: true,
  },
} satisfies Prisma.ClientDefaultArgs;

/** Explicit select, never a bare row spread — see the users module for why. */
const REQUEST_SELECT = {
  id: true,
  reference: true,
  clientId: true,
  client: CLIENT_SELECT,
  assignedBrokerId: true,
  assignedBroker: ACTOR_SELECT,
  source: true,
  status: true,
  originAirportId: true,
  originAirport: AIRPORT_SELECT,
  destinationAirportId: true,
  destinationAirport: AIRPORT_SELECT,
  departureDate: true,
  returnDate: true,
  quoteDeadline: true,
  passengers: true,
  aircraftPreference: true,
  estimatedValue: true,
  summary: true,
  requirements: true,
  internalNotes: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.TripRequestSelect;

const REQUEST_DETAIL_SELECT = {
  ...REQUEST_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.TripRequestSelect;

/** A request nobody has closed out either way. */
const OPEN_STATUSES = [
  TripRequestStatus.OPEN,
  TripRequestStatus.SOURCING,
  TripRequestStatus.QUOTED,
];

/**
 * Departure relative to today, in the server's local day.
 *
 * The same shape as the clients module's `followUpFilter`, and the second
 * copy of it — lift both into `common/database/filters.ts` if a third module
 * needs a date-window filter rather than writing this a third time.
 */
function departureFilter(
  window: RequestWindow | undefined,
): Prisma.TripRequestWhereInput {
  if (!window) return {};

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const tomorrow = new Date(start);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (window) {
    case 'OVERDUE':
      return { departureDate: { lt: start } };
    case 'TODAY':
      return { departureDate: { gte: start, lt: tomorrow } };
    case 'UPCOMING':
      return { departureDate: { gte: tomorrow } };
    default:
      return {};
  }
}

type RequestRow = { estimatedValue: Prisma.Decimal | null };

@Injectable()
export class TripRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sourcing: OperatorQuotesService,
  ) {}

  /**
   * Attaches what sourcing knows about these enquiries.
   *
   * The sourcing board's "4 contacted, 3 responded" and its four stages —
   * Requested, Pending Operator Quote, Sourcing, Source Complete — are counted
   * from the quotes every time they are read, never stored. A stored stage is
   * wrong the moment the next operator replies.
   *
   * Added in the second pass when Operator Sourcing shipped. Before that these
   * keys were absent and the screen was dummy-backed; leaving them absent now
   * would make the board say "0 contacted" about an enquiry four operators are
   * working on, which is a wrong answer rather than a missing one.
   */
  private async withSourcing<T extends { id: string }>(rows: T[]) {
    const summaries = await this.sourcing.summaryFor(rows.map((row) => row.id));
    return rows.map((row) => ({
      ...row,
      sourcing: summaries.get(row.id) ?? null,
    }));
  }

  /**
   * `estimatedValue` is a Prisma Decimal, which serialises to a string. The
   * board formats it as money, so it is converted once here rather than in
   * every caller — the same treatment airports give latitude.
   */
  private serialise<T extends RequestRow>(row: T) {
    return {
      ...row,
      estimatedValue:
        row.estimatedValue === null ? null : Number(row.estimatedValue),
    };
  }

  /**
   * Row-level visibility.
   *
   * A broker sees the enquiries assigned to them, matching how they see their
   * own clients and their own trips. Applied in the query rather than filtered
   * afterwards, so their pagination counts and pipeline totals are correct
   * rather than merely censored.
   *
   * An unassigned request is deliberately visible to everyone: a request that
   * arrived before the desk picked an owner is exactly the one that must not
   * disappear.
   */
  private visibilityScope(
    user: AuthenticatedUser,
  ): Prisma.TripRequestWhereInput {
    if (scopeFor(user.role, Permission.VIEW_TRIPS) === Scope.ALL) return {};
    return {
      OR: [{ assignedBrokerId: user.id }, { assignedBrokerId: null }],
    };
  }

  /** Rejects a client, broker or airport the caller cannot actually link to. */
  private async assertClient(id: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!client) {
      throw new BadRequestException('That client does not exist');
    }
  }

  private async assertBroker(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const broker = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!broker) {
      throw new BadRequestException('That broker does not exist');
    }
  }

  private async assertAirport(
    id: string | null | undefined,
    label: string,
  ): Promise<void> {
    if (!id) return;
    const airport = await this.prisma.airport.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!airport) {
      throw new BadRequestException(`That ${label} airport does not exist`);
    }
    // Archived is not the same as missing, and the fix is different.
    if (airport.deletedAt) {
      throw new BadRequestException(
        `That ${label} airport has been archived. Restore it, or choose another.`,
      );
    }
  }

  async findAll(
    user: AuthenticatedUser,
    query: QueryTripRequestsInput,
  ): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.TripRequestWhereInput = {
      ...archiveFilter(query.archived),
      ...this.visibilityScope(user),
      ...equalsAny(query, [
        'status',
        'source',
        'aircraftPreference',
        'clientId',
        'assignedBrokerId',
        'originAirportId',
        'destinationAirportId',
      ]),
      ...departureFilter(query.departure),
      // The working list, not the archive: a converted or lost request is
      // history, and leaving it on the board buries the ones needing a price.
      ...(query.openOnly ? { status: { in: OPEN_STATUSES } } : {}),
      ...(query.search
        ? {
            OR: [
              { summary: { contains: query.search, mode: 'insensitive' } },
              { client: { firstName: { contains: query.search, mode: 'insensitive' } } },
              { client: { lastName: { contains: query.search, mode: 'insensitive' } } },
              { client: { companyName: { contains: query.search, mode: 'insensitive' } } },
              { originAirport: { icao: { contains: query.search, mode: 'insensitive' } } },
              { destinationAirport: { icao: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tripRequest.findMany({
        where,
        select: REQUEST_SELECT,
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.tripRequest.count({ where }),
    ]);

    return paginate(
      await this.withSourcing(rows.map((row) => this.serialise(row))),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Archived rows included, deliberately — the Archived tab links straight
   * here. Rows outside the caller's scope return 404 rather than 403: a 403
   * confirms the record exists and turns any id into an oracle.
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.tripRequest.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: REQUEST_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Trip request not found');
    const [withSourcing] = await this.withSourcing([this.serialise(row)]);
    return withSourcing;
  }

  /**
   * The tiles above the Open Requests board, scoped like the list.
   *
   * `pipelineValue` sums only the open statuses — a converted request's value
   * belongs to the trip it became, and counting it here would double it.
   */
  async stats(user: AuthenticatedUser) {
    const scope: Prisma.TripRequestWhereInput = {
      deletedAt: null,
      ...this.visibilityScope(user),
    };

    const [open, sourcing, quoted, converted, pipeline] =
      await this.prisma.$transaction([
        this.prisma.tripRequest.count({
          where: { ...scope, status: TripRequestStatus.OPEN },
        }),
        this.prisma.tripRequest.count({
          where: { ...scope, status: TripRequestStatus.SOURCING },
        }),
        this.prisma.tripRequest.count({
          where: { ...scope, status: TripRequestStatus.QUOTED },
        }),
        this.prisma.tripRequest.count({
          where: { ...scope, status: TripRequestStatus.CONVERTED },
        }),
        this.prisma.tripRequest.aggregate({
          where: { ...scope, status: { in: OPEN_STATUSES } },
          _sum: { estimatedValue: true },
        }),
      ]);

    return {
      open,
      sourcing,
      quoted,
      converted,
      total: open + sourcing + quoted + converted,
      pipelineValue: Number(pipeline._sum.estimatedValue ?? 0),
    };
  }

  async create(user: AuthenticatedUser, dto: CreateTripRequestInput) {
    await this.assertClient(dto.clientId);
    await this.assertBroker(dto.assignedBrokerId);
    await this.assertAirport(dto.originAirportId, 'origin');
    await this.assertAirport(dto.destinationAirportId, 'destination');

    // A broker files enquiries for themselves; only a wider scope may assign
    // one to someone else.
    const assignedBrokerId =
      user.role === UserRole.BROKER
        ? user.id
        : (dto.assignedBrokerId ?? null);

    const request = await this.prisma.tripRequest.create({
      data: {
        ...dto,
        assignedBrokerId,
        createdById: user.id,
        updatedById: user.id,
      },
      select: REQUEST_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'trip_request.created',
      entityType: 'TripRequest',
      entityId: request.id,
      metadata: {
        reference: request.reference,
        clientId: request.clientId,
        status: request.status,
      },
    });

    return this.serialise(request);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateTripRequestInput,
  ) {
    const target = await this.prisma.tripRequest.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: {
        id: true,
        reference: true,
        status: true,
        assignedBrokerId: true,
        originAirportId: true,
        destinationAirportId: true,
      },
    });
    if (!target) throw new NotFoundException('Trip request not found');

    if (dto.clientId) await this.assertClient(dto.clientId);
    if (
      dto.assignedBrokerId !== undefined &&
      dto.assignedBrokerId !== target.assignedBrokerId
    ) {
      // A broker must not hand their own enquiry to someone else or claim
      // another's — the same rule clients use for reassignment.
      if (user.role === UserRole.BROKER) {
        throw new ForbiddenException(
          'Only administrators can reassign a trip request',
        );
      }
      await this.assertBroker(dto.assignedBrokerId);
    }
    // Only a link that is actually changing is validated: an edit form
    // resends every field, and an airport archived later must not make the
    // request uneditable.
    if (
      dto.originAirportId !== undefined &&
      dto.originAirportId !== target.originAirportId
    ) {
      await this.assertAirport(dto.originAirportId, 'origin');
    }
    if (
      dto.destinationAirportId !== undefined &&
      dto.destinationAirportId !== target.destinationAirportId
    ) {
      await this.assertAirport(dto.destinationAirportId, 'destination');
    }

    const request = await this.prisma.tripRequest.update({
      where: { id },
      data: { ...dto, updatedById: user.id },
      select: REQUEST_SELECT,
    });

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (dto.status && dto.status !== target.status) {
      changes.status = { from: target.status, to: dto.status };
    }

    await this.audit.record({
      actorId: user.id,
      action: 'trip_request.updated',
      entityType: 'TripRequest',
      entityId: id,
      metadata: {
        reference: target.reference,
        changes,
        fields: Object.keys(dto),
      },
    });

    return this.serialise(request);
  }

  /**
   * Archiving an enquiry is an administrator's call, like archiving a client.
   *
   * A broker who has stopped working one sets its status to LOST, which keeps
   * it in the pipeline history and in the conversion figures. Removing the row
   * quietly improves everyone's conversion rate, which is exactly the wrong
   * incentive to build into a sales tool.
   */
  private assertMayArchive(user: AuthenticatedUser): void {
    if (scopeFor(user.role, Permission.DELETE_TRIPS) !== Scope.ALL) {
      throw new ForbiddenException(
        'Only administrators can remove a trip request. Mark it Lost instead.',
      );
    }
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertMayArchive(user);
    const target = await this.findOne(user, id);

    await this.prisma.tripRequest.update({
      where: { id },
      data: { ...archiveData(user.id), updatedById: user.id },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'trip_request.removed',
      entityType: 'TripRequest',
      entityId: id,
      metadata: { reference: target.reference },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    this.assertMayArchive(user);
    const target = await this.prisma.tripRequest.findFirst({
      where: { id, deletedAt: { not: null }, ...this.visibilityScope(user) },
      select: { id: true, reference: true },
    });
    if (!target) throw new NotFoundException('Archived trip request not found');

    const request = await this.prisma.tripRequest.update({
      where: { id },
      data: { ...restoreData(user.id), updatedById: user.id },
      select: REQUEST_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'trip_request.restored',
      entityType: 'TripRequest',
      entityId: id,
      metadata: { reference: target.reference },
    });

    return this.serialise(request);
  }

  async removeMany(
    user: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    this.assertMayArchive(user);
    const targets = await this.prisma.tripRequest.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        ...this.visibilityScope(user),
      },
      select: { id: true, reference: true },
    });

    if (targets.length > 0) {
      await this.prisma.tripRequest.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });

      await this.audit.record({
        actorId: user.id,
        action: 'trip_request.removed_bulk',
        entityType: 'TripRequest',
        entityId: null,
        metadata: {
          count: targets.length,
          references: targets.map((row) => row.reference),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(
    user: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    this.assertMayArchive(user);
    const targets = await this.prisma.tripRequest.findMany({
      where: {
        id: { in: ids },
        deletedAt: { not: null },
        ...this.visibilityScope(user),
      },
      select: { id: true, reference: true },
    });

    if (targets.length > 0) {
      await this.prisma.tripRequest.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });

      await this.audit.record({
        actorId: user.id,
        action: 'trip_request.restored_bulk',
        entityType: 'TripRequest',
        entityId: null,
        metadata: {
          count: targets.length,
          references: targets.map((row) => row.reference),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  /** The enquiries attached to one client, for the client detail page. */
  async listForClient(clientId: string) {
    const rows = await this.prisma.tripRequest.findMany({
      where: { clientId, deletedAt: null },
      select: REQUEST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.serialise(row));
  }
}

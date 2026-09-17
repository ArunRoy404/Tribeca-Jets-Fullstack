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
import { bulkResult, type BulkResult } from '../../common/dto/bulk.dto.js';
import {
  Permission,
  Scope,
  scopeFor,
} from '../../common/authorization/permissions.js';
import {
  ClientStatus,
  LeadStage,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateClientInput,
  QueryClientsInput,
  UpdateClientInput,
} from './dto/client.dto.js';

const CLIENT_LIST_SELECT = {
  id: true,
  type: true,
  companyName: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  status: true,
  birthday: true,
  /** The related row, so the table can show "KTEB" and link to the airport. */
  homeAirport: { select: { id: true, icao: true, name: true, city: true } },
  priority: true,
  followUpMethod: true,
  nextFollowUpAt: true,
  followUpNote: true,
  leadSource: true,
  leadStage: true,
  /**
   * Notes and preferences are read as well as written. They were accepted by
   * the DTO and stored but left out of this select, which made them
   * write-only: the detail page said "No internal notes on file" about a
   * client whose notes were in the database, and the edit form — which
   * prefills from this response — reopened with them blank and posted the
   * emptied object straight back.
   */
  notes: true,
  preferences: true,
  labels: true,
  createdAt: true,
  updatedAt: true,
  assignedBroker: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  createdById: true,
  updatedById: true,
  // The Archived tab needs who removed it and when, and the live list needs
  // `restoredAt` for the badge — same four columns as every other module.
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.ClientSelect;

/**
 * The detail view: the list's columns plus the originating broker, who is only
 * ever shown on one record at a time.
 *
 * `findOne` used to use `include` instead, which returned every scalar column
 * and the two broker relations — but *not* `homeAirport`, because an `include`
 * only adds the relations it names. So the detail endpoint answered with a
 * bare `homeAirportId` while the list answered with the airport row, and the
 * client detail page rendered "—" for the home airport of every client that
 * had one. Worse, the edit form prefills from this response: it reopened with
 * the picker blank and saved that blank back. One select for both shapes is
 * what stops the two drifting again.
 */
const CLIENT_DETAIL_SELECT = {
  ...CLIENT_LIST_SELECT,
  originatingBroker: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.ClientSelect;

/**
 * The Due Today / Overdue / Upcoming filter, resolved against the current
 * clock on every request.
 *
 * "Today" is the server's day boundary. That is a simplification worth naming:
 * a desk spanning time zones will disagree at the edges, and the fix is a
 * per-user timezone, which nothing else in the system carries yet.
 *
 * Module-private for now. The moment payments or quotes need the same three
 * windows this lifts into `common/database/filters.ts` and both callers move
 * with it.
 */
function followUpFilter(
  window: 'OVERDUE' | 'TODAY' | 'UPCOMING' | undefined,
): Prisma.ClientWhereInput {
  if (!window) return {};

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  switch (window) {
    case 'OVERDUE':
      return { nextFollowUpAt: { lt: startOfToday } };
    case 'TODAY':
      return { nextFollowUpAt: { gte: startOfToday, lt: startOfTomorrow } };
    case 'UPCOMING':
      return { nextFollowUpAt: { gte: startOfTomorrow } };
  }
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Row-level visibility.
   *
   * Brokers see only the clients assigned to them (scope §6.2, §11). This is
   * applied in the query rather than filtered after the fact, so a broker's
   * pagination counts and totals are correct rather than merely censored.
   */
  private visibilityScope(user: AuthenticatedUser): Prisma.ClientWhereInput {
    if (user.role === UserRole.BROKER) {
      return { assignedBrokerId: user.id };
    }
    return {};
  }

  async findAll(
    user: AuthenticatedUser,
    query: QueryClientsInput,
  ): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.ClientWhereInput = {
      ...archiveFilter(query.archived),
      ...this.visibilityScope(user),
      ...equalsAny(query, [
        'type',
        'status',
        'leadStage',
        'leadSource',
        'priority',
        'assignedBrokerId',
      ]),
      ...followUpFilter(query.followUp),
      // Not an equality filter: `labels` is an array column, so this asks
      // whether the label is among them.
      ...(query.label ? { labels: { has: query.label } } : {}),
      ...searchAcross(query.search, [
        'firstName',
        'lastName',
        'companyName',
        'email',
        'phone',
      ]),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        select: CLIENT_LIST_SELECT,
        // `sortBy` is narrowed to CLIENT_SORTABLE_FIELDS by the DTO, so no
        // caller-supplied string can reach the ORDER BY clause.
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.client.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  /**
   * The detail view, archived rows included.
   *
   * The Archived tab links to these pages, so filtering `deletedAt: null` here
   * listed a row and then 404'd it when anyone clicked through. Aircraft and
   * Operators already load an archived record and offer Restore in place of
   * Edit and Remove; this brings Clients in line.
   *
   * Writes do not go through here — they use `findLive` below, which keeps the
   * filter, so an archived client still cannot be edited or re-archived.
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: CLIENT_DETAIL_SELECT,
    });

    // Deliberately 404 and not 403: a broker should not be able to confirm
    // that another broker's client exists by probing IDs.
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  /** The same scoped lookup, but only for a live row. Guards every write. */
  private async findLive(user: AuthenticatedUser, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  /**
   * A home airport must name a live airport row.
   *
   * Prisma would raise P2003 on a bad id, which the exception filter turns
   * into a 400 — but with no field name attached. Checking here means the form
   * can point at the right input, and it also catches an *archived* airport,
   * which the foreign key alone would happily accept.
   */
  private async assertHomeAirport(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const airport = await this.prisma.airport.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!airport) {
      throw new BadRequestException('That home airport does not exist');
    }
  }

  async create(user: AuthenticatedUser, input: CreateClientInput) {
    await this.assertHomeAirport(input.homeAirportId);

    // A broker may only create clients owned by themselves.
    const assignedBrokerId =
      user.role === UserRole.BROKER
        ? user.id
        : (input.assignedBrokerId ?? null);

    const { preferences, ...fields } = input;

    const client = await this.prisma.client.create({
      data: {
        ...fields,
        assignedBrokerId,
        // Attribution defaults to the creator and never changes afterwards.
        originatingBrokerId: input.originatingBrokerId ?? assignedBrokerId,
        preferences: preferences as Prisma.InputJsonValue,
        // Audit columns, set from the session rather than the payload. Kept
        // distinct from assignedBroker: an admin can create a client for
        // someone else, and reassigning it later must not rewrite who entered
        // the record.
        createdById: user.id,
        updatedById: user.id,
      },
      select: CLIENT_LIST_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'client.created',
      entityType: 'Client',
      entityId: client.id,
      metadata: { name: `${client.firstName} ${client.lastName}` },
    });

    return client;
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateClientInput) {
    // Reuses the scoped read, so an out-of-scope id 404s before any write.
    await this.findLive(user, id);
    await this.assertHomeAirport(input.homeAirportId);

    // Reassigning a client is an admin action; a broker must not be able to
    // hand their own client to someone else or claim another's.
    if (input.assignedBrokerId && user.role === UserRole.BROKER) {
      throw new ForbiddenException('Only administrators can reassign a client');
    }

    // `preferences` is split out of the spread: leaving a structured object in
    // there makes Prisma's checked/unchecked input union unresolvable.
    const { preferences, ...fields } = input;

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...fields,
        updatedById: user.id,
        ...(preferences
          ? { preferences: preferences as Prisma.InputJsonValue }
          : {}),
      },
      select: CLIENT_LIST_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'client.updated',
      entityType: 'Client',
      entityId: id,
      metadata: { fields: Object.keys(input) },
    });

    return client;
  }

  /**
   * Soft delete. Historical business data is never destroyed (scope §6.19,
   * and Ari's explicit requirement that losing history is unacceptable).
   */
  /**
   * Brings an archived client back, exactly as it was.
   *
   * Scoped like every other client read: a broker may only restore a client
   * that was theirs, and anything outside their scope is a 404 rather than a
   * 403, so an id cannot be used to probe for records.
   */
  async restore(user: AuthenticatedUser, id: string) {
    // Symmetry: whoever may archive may un-archive, nobody else.
    this.assertMayArchive(user);
    const target = await this.prisma.client.findFirst({
      where: { id, deletedAt: { not: null }, ...this.visibilityScope(user) },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!target) throw new NotFoundException('Archived client not found');

    const client = await this.prisma.client.update({
      where: { id },
      data: { ...restoreData(user.id), updatedById: user.id },
      select: CLIENT_LIST_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'client.restored',
      entityType: 'Client',
      entityId: id,
      metadata: { name: `${target.firstName} ${target.lastName}`.trim() },
    });

    return client;
  }

  /**
   * Archiving a client is an administrator's call, not a broker's.
   *
   * This preserves the rule the controller used to spell out as an ad-hoc
   * `@Roles(SUPER_ADMIN, ADMIN)` list, but expresses it through the permission
   * matrix instead — a broker holds MANAGE_CLIENTS at ASSIGNED scope, which is
   * enough to create and edit their own book but not to remove from it. A
   * broker losing a client should reassign it, not erase it from the list.
   */
  private assertMayArchive(user: AuthenticatedUser): void {
    if (scopeFor(user.role, Permission.MANAGE_CLIENTS) !== Scope.ALL) {
      throw new ForbiddenException(
        'Only administrators can remove a client. Reassign it instead.',
      );
    }
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertMayArchive(user);
    await this.findLive(user, id);

    await this.prisma.client.update({
      where: { id },
      data: { ...archiveData(user.id), updatedById: user.id },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'client.deleted',
      entityType: 'Client',
      entityId: id,
    });
  }

  /**
   * The Agents roster: every broker, with the lead numbers behind them.
   *
   * "Agents" on that screen means the desk's own brokers, not travel agents —
   * travel agents are Clients of type TRAVEL_AGENT and live in the client
   * directory. The roster is therefore a *view over Users*, not a table of its
   * own, which is why there is no create form: staff are invited through Users
   * & Roles, where the permission matrix and the suspend rules already live.
   *
   * Aggregated in three grouped queries rather than one per broker, so the
   * roster costs the same whether the desk has four brokers or forty.
   */
  async brokerPerformance(user: AuthenticatedUser) {
    const scope = this.visibilityScope(user);

    const brokers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        role: {
          in: [UserRole.BROKER, UserRole.SENIOR_BROKER, UserRole.ADMIN],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarKey: true,
        maxActiveLeads: true,
        defaultFollowUpMethod: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const live: Prisma.ClientWhereInput = { deletedAt: null, ...scope };
    const now = new Date();

    const [leadRows, wonRows, followUpRows] = await this.prisma.$transaction([
      this.prisma.client.groupBy({
        by: ['assignedBrokerId'],
        where: { ...live, status: ClientStatus.LEAD },
        _count: { _all: true },
      }),
      this.prisma.client.groupBy({
        by: ['assignedBrokerId'],
        where: { ...live, leadStage: LeadStage.WON },
        _count: { _all: true },
      }),
      this.prisma.client.groupBy({
        by: ['assignedBrokerId'],
        where: { ...live, nextFollowUpAt: { lte: now } },
        _count: { _all: true },
      }),
    ]);

    const countsFor = (
      rows: { assignedBrokerId: string | null; _count: { _all: number } }[],
    ) =>
      new Map(
        rows
          .filter((row) => row.assignedBrokerId !== null)
          .map((row) => [row.assignedBrokerId as string, row._count._all]),
      );

    const activeLeads = countsFor(leadRows);
    const convertedLeads = countsFor(wonRows);
    const followUpsDue = countsFor(followUpRows);

    return brokers.map((broker) => {
      const active = activeLeads.get(broker.id) ?? 0;
      const converted = convertedLeads.get(broker.id) ?? 0;
      const handled = active + converted;

      return {
        ...broker,
        activeLeads: active,
        convertedLeads: converted,
        followUpsDue: followUpsDue.get(broker.id) ?? 0,
        /**
         * Null, not 0%, when a broker has handled nothing yet. A new broker
         * showing "0% conversion" is a wrong answer that follows them around;
         * an em dash says the truth, which is that there is nothing to
         * measure. Whole percent — 66.7% invites comparisons the sample size
         * cannot support.
         */
        conversionRate:
          handled === 0 ? null : Math.round((converted / handled) * 100),
        /**
         * Load against the broker's own cap. Null when no cap is set rather
         * than inventing one: "Medium" measured against a number nobody chose
         * is an opinion dressed as a metric.
         */
        capacityUsed:
          broker.maxActiveLeads && broker.maxActiveLeads > 0
            ? Math.round((active / broker.maxActiveLeads) * 100)
            : null,
        // An aggregate over trips, which do not exist yet. Null so the roster
        // renders an em dash rather than claiming a broker has flown nobody.
        activeTrips: null,
      };
    });
  }

  /**
   * The four tiles above the clients table.
   *
   * Scoped like the list, so a broker's tiles count their own book rather than
   * the company's — a broker seeing "16 clients" over a table of 4 is a leak of
   * exactly the kind §11 forbids.
   */
  async stats(user: AuthenticatedUser) {
    const base: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...this.visibilityScope(user),
    };

    const startOfTomorrow = new Date();
    startOfTomorrow.setHours(0, 0, 0, 0);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const [total, active, vip, leads, followUpsDue, addedThisYear] =
      await this.prisma.$transaction([
        this.prisma.client.count({ where: base }),
        this.prisma.client.count({
          where: { ...base, status: ClientStatus.ACTIVE },
        }),
        this.prisma.client.count({ where: { ...base, status: ClientStatus.VIP } }),
        // The Leads screen's own total. Counted here rather than by the leads
        // tile calling the list endpoint for a `meta.total` it would throw
        // away — and it keeps the whole stats row on one round trip.
        this.prisma.client.count({
          where: { ...base, status: ClientStatus.LEAD },
        }),
        // Overdue and due-today together: both are "deal with this now".
        this.prisma.client.count({
          where: { ...base, nextFollowUpAt: { lt: startOfTomorrow } },
        }),
        this.prisma.client.count({
          where: { ...base, createdAt: { gte: startOfYear } },
        }),
      ]);

    return {
      total,
      active,
      vip,
      leads,
      activeAndVip: active + vip,
      followUpsDue,
      addedThisYear,
      year: startOfYear.getFullYear(),
    };
  }

  /**
   * Removes several clients at once, for the table's checkbox column.
   *
   * Scoped read first, so a broker cannot clear rows outside their book by
   * posting ids, and so the audit entry can name what actually went.
   */
  async removeMany(
    user: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    this.assertMayArchive(user);

    const targets = await this.prisma.client.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        ...this.visibilityScope(user),
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (targets.length > 0) {
      await this.prisma.client.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });

      await this.audit.record({
        actorId: user.id,
        action: 'client.removed_bulk',
        entityType: 'Client',
        entityId: null,
        metadata: {
          count: targets.length,
          clients: targets.map((row) => ({
            id: row.id,
            name: `${row.firstName} ${row.lastName}`,
          })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  /**
   * Brings several archived clients back at once. Mirrors `removeMany`.
   *
   * The scope filter is deliberately applied here too: a broker restoring
   * rows must only reach their own.
   */
  async restoreMany(
    user: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    this.assertMayArchive(user);

    const targets = await this.prisma.client.findMany({
      where: {
        id: { in: ids },
        deletedAt: { not: null },
        ...this.visibilityScope(user),
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (targets.length > 0) {
      await this.prisma.client.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });

      await this.audit.record({
        actorId: user.id,
        action: 'client.restored_bulk',
        entityType: 'Client',
        entityId: null,
        metadata: {
          count: targets.length,
          clients: targets.map((row) => ({
            id: row.id,
            name: `${row.firstName} ${row.lastName}`,
          })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }
}

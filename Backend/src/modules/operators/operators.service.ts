import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { AircraftService } from '../aircraft/aircraft.service.js';
import { OperatorQuotesService } from '../operator-quotes/operator-quotes.service.js';
import { TripsService } from '../trips/trips.service.js';
import { OperatorPaymentsService } from '../operator-payments/operator-payments.service.js';
import { Permission, Scope, scopeFor } from '../../common/authorization/permissions.js';
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
import { OperatorStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateOperatorInput,
  QueryOperatorsInput,
  UpdateOperatorInput,
} from './dto/operator.dto.js';

/** Explicit select, never a bare row spread — see the users module for why. */
const OPERATOR_SELECT = {
  id: true,
  name: true,
  status: true,
  homeBase: true,
  website: true,
  generalEmail: true,
  generalPhone: true,
  primaryContact: true,
  contactEmail: true,
  contactPhone: true,
  aircraftTypes: true,
  serviceRoutes: true,
  reliabilityRating: true,
  safetyRating: true,
  responseSpeed: true,
  cancellationPolicy: true,
  paymentTerms: true,
  sourcingNotes: true,
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
} satisfies Prisma.OperatorSelect;

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const OPERATOR_DETAIL_SELECT = {
  ...OPERATOR_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.OperatorSelect;


@Injectable()
export class OperatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    // Aircraft owns its own table; the Fleet tab reads through its service
    // rather than querying `aircraft` from here. See AGENTS.md — cross-module
    // reads go through the owning module.
    private readonly aircraft: AircraftService,
    // Same arrangement as the fleet: sourcing owns the quotes table and the
    // operator detail page borrows its scorecard. One-way edge, no cycle.
    private readonly sourcing: OperatorQuotesService,
    // Trips (#11)'s second pass: trip counts come through its service.
    private readonly trips: TripsService,
    // Operator Payments (#17)'s second pass: what has been paid to each.
    private readonly payables: OperatorPaymentsService,
  ) {}

  /**
   * Real trip counts, one grouped query (cancelled trips are not counted), and
   * the total paid to each operator.
   *
   * `totalPaid` is money, summed across every trip — so only a caller who
   * sees every operator bill gets it. A broker reads the bills on their own
   * trips only, and a total over all of them would show what other brokers'
   * trips paid. For them, and for anyone without the permission, it is null
   * and the screen shows an em dash — never $0.
   */
  private async withTrips<T extends { id: string }>(user: AuthenticatedUser, rows: T[]) {
    const ids = rows.map((row) => row.id);
    const seesTotals = scopeFor(user.role, Permission.VIEW_OPERATOR_PAYMENTS) === Scope.ALL;
    const [counts, paid] = await Promise.all([
      this.trips.countByOperator(ids),
      seesTotals ? this.payables.paidByOperator(ids) : Promise.resolve(null),
    ]);
    return rows.map((row) => ({
      ...row,
      totalTrips: counts.get(row.id)?.total ?? 0,
      totalPaid: paid ? (paid.get(row.id) ?? 0) : null,
    }));
  }

  // Reference data is the same rows for everyone signed in; the caller is
  // read only to decide whether the money column is theirs to see.
  async findAll(user: AuthenticatedUser, query: QueryOperatorsInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.OperatorWhereInput = {
      // One endpoint serves the table and its Archived tab; a separate
      // /archived route would duplicate every filter and sort param.
      ...archiveFilter(query.archived),
      ...equalsAny(query, ['status']),
      ...searchAcross(query.search, [
        'name',
        'homeBase',
        'primaryContact',
        'contactEmail',
        'generalEmail',
      ]),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.operator.findMany({
        where,
        select: OPERATOR_SELECT,
        // `sortBy` is narrowed to OPERATOR_SORTABLE_FIELDS by the DTO.
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.operator.count({ where }),
    ]);

    return paginate(
      await this.withTrips(user, rows),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Archived rows included, deliberately.
   *
   * The Archived tab links to this page, so filtering them out here made every
   * archived operator's detail a 404 — the row was listed and then refused.
   * The payload carries the archive trail, so the page can say it is archived
   * and offer Restore rather than pretending it is live.
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.operator.findFirst({
      where: { id },
      select: OPERATOR_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Operator not found');

    // The Fleet tab shows real airframes now that Aircraft exists. It used to
    // be an empty array, which stopped being "not built yet" and started being
    // a wrong answer the moment this operator's tails were in the database.
    const fleet = await this.aircraft.listForOperator(id);

    // The part of the §6.7 scorecard the data can actually answer, now that
    // sourcing exists: how often they reply, how fast, and how often we go
    // with them. The rest of that scorecard — accuracy, hidden fees, crew and
    // cabin quality, passenger feedback — has no agreed rating scale (§17), so
    // it is absent rather than invented.
    const scorecard = await this.sourcing.scorecardFor(id);

    const [withCounts] = await this.withTrips(user, [row]);
    return {
      ...withCounts,
      fleet,
      fleetSize: fleet.length,
      scorecard,
      // The Trip History and Payments tabs page `GET /trips?operatorId=` and
      // `GET /operator-payments?operatorId=` themselves. The empty arrays
      // that stood in for them are gone: left in place, `payments: []` would
      // claim an operator we have paid has never been paid.
    };
  }

  /**
   * The operator as the owner of a record in another module — its vault
   * documents (#22). Operators are desk reference data with no row scope, so
   * this only resolves the row: 404 when it does not exist, and whether it
   * is archived so the caller can refuse a write on a closed record.
   */
  async subjectRef(id: string): Promise<{ id: string; label: string; archived: boolean }> {
    const row = await this.prisma.operator.findUnique({
      where: { id },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!row) throw new NotFoundException('Operator not found');
    return { id: row.id, label: row.name, archived: row.deletedAt !== null };
  }

  /**
   * The operator as an email recipient (Email Templates, #21): the named
   * contact's address, else the company's general one. Operators are desk
   * reference data, so there is no row scope to apply. `email` is null when
   * neither is on file.
   */
  async emailRecipient(id: string) {
    const row = await this.prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        primaryContact: true,
        contactEmail: true,
        generalEmail: true,
        deletedAt: true,
      },
    });
    if (!row) throw new NotFoundException('Operator not found');
    return {
      id: row.id,
      name: row.name,
      contact: row.primaryContact ?? null,
      email: row.contactEmail ?? row.generalEmail ?? null,
      archived: row.deletedAt !== null,
    };
  }

  /** The four tiles above the operators table. */
  async stats() {
    const where: Prisma.OperatorWhereInput = { deletedAt: null };

    // One grouped count rather than "total minus the others": with a fourth
    // status, the remainder would have counted suspended operators as
    // inactive.
    const [total, byStatus] = await Promise.all([
      this.prisma.operator.count({ where }),
      this.prisma.operator.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ]);
    const count = (status: OperatorStatus) =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;

    return {
      total,
      active: count(OperatorStatus.ACTIVE),
      preferred: count(OperatorStatus.PREFERRED),
      inactive: count(OperatorStatus.INACTIVE),
      suspended: count(OperatorStatus.SUSPENDED),
      // "Total Fleet" counts airframes across every operator. A real number
      // now that Aircraft has shipped; it was null while the table did not
      // exist, which is the honest stand-in this project uses for an aggregate
      // nothing can supply.
      totalFleet: await this.aircraft.countAll(),
    };
  }

  async create(actor: AuthenticatedUser, dto: CreateOperatorInput) {
    const operator = await this.prisma.operator.create({
      data: { ...dto, createdById: actor.id, updatedById: actor.id },
      select: OPERATOR_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'operator.created',
      entityType: 'Operator',
      entityId: operator.id,
      metadata: { name: operator.name, status: operator.status },
    });

    const [withTotals] = await this.withTrips(actor, [operator]);
    return withTotals;
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateOperatorInput) {
    const target = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, status: true },
    });
    if (!target) throw new NotFoundException('Operator not found');

    const operator = await this.prisma.operator.update({
      where: { id },
      // `updatedById` comes from the session, never the request body.
      data: { ...dto, updatedById: actor.id },
      select: OPERATOR_SELECT,
    });

    // Record what actually changed, not the whole payload.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (dto.status && dto.status !== target.status) {
      changes.status = { from: target.status, to: dto.status };
    }

    await this.audit.record({
      actorId: actor.id,
      action: 'operator.updated',
      entityType: 'Operator',
      entityId: id,
      metadata: { name: target.name, changes, fields: Object.keys(dto) },
    });

    const [withTotals] = await this.withTrips(actor, [operator]);
    return withTotals;
  }

  /**
   * Brings an archived operator back, exactly as it was.
   *
   * Clears the deletion stamp and nothing else. See the airports service for
   * why a restore never re-runs the create form.
   */
  async restore(actor: AuthenticatedUser, id: string) {
    const target = await this.prisma.operator.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, name: true },
    });
    if (!target) throw new NotFoundException('Archived operator not found');

    const operator = await this.prisma.operator.update({
      where: { id },
      data: { ...restoreData(actor.id), updatedById: actor.id },
      select: OPERATOR_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'operator.restored',
      entityType: 'Operator',
      entityId: id,
      metadata: { name: target.name },
    });

    const [withTotals] = await this.withTrips(actor, [operator]);
    return withTotals;
  }

  /**
   * Removes several operators at once, for the table's checkbox column.
   *
   * Soft delete like the single case — trips, quotes and payments will point
   * at these rows. Ids matching nothing are reported as `skipped` rather than
   * failing the batch; see `bulkResult`.
   */
  async removeMany(
    actor: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    // Read first, so the audit log names what was actually removed.
    const targets = await this.prisma.operator.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true },
    });

    if (targets.length > 0) {
      await this.prisma.operator.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(actor.id), updatedById: actor.id },
      });

      await this.audit.record({
        actorId: actor.id,
        action: 'operator.removed_bulk',
        entityType: 'Operator',
        entityId: null,
        metadata: {
          count: targets.length,
          operators: targets.map((row) => ({ id: row.id, name: row.name })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  /**
   * Brings several archived operators back at once.
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
    const targets = await this.prisma.operator.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, name: true },
    });

    if (targets.length > 0) {
      await this.prisma.operator.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(actor.id), updatedById: actor.id },
      });

      await this.audit.record({
        actorId: actor.id,
        action: 'operator.restored_bulk',
        entityType: 'Operator',
        entityId: null,
        metadata: {
          count: targets.length,
          operators: targets.map((row) => ({ id: row.id, name: row.name })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  /**
   * Soft delete. The row stays because trips, quotes and payments will point
   * at it: destroying an operator would orphan the history of every flight it
   * ever operated.
   */
  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    const target = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!target) throw new NotFoundException('Operator not found');

    await this.prisma.operator.update({
      where: { id },
      // `archiveData`, not a hand-written `deletedAt`: writing the stamp
      // directly skipped `deletedById`, so the Archived tab's "Removed By"
      // column rendered an em dash for every operator removed this way.
      data: { ...archiveData(actor.id), updatedById: actor.id },
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'operator.removed',
      entityType: 'Operator',
      entityId: id,
      metadata: { name: target.name },
    });
  }
}

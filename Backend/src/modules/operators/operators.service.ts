import { Injectable, NotFoundException } from '@nestjs/common';
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

/**
 * Columns the UI shows that nothing can supply yet.
 *
 * `totalTrips` and `totalPaid` are aggregates over trips and operator
 * payments, neither of which exists. They are returned as null rather than 0,
 * because a confident "0 trips" against an operator the desk has flown twice is
 * a wrong answer, and null lets the UI render an honest em dash. They become
 * real counts when those modules land — see AGENTS.md on build order.
 */
const UNAVAILABLE_AGGREGATES = { totalTrips: null, totalPaid: null } as const;

@Injectable()
export class OperatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // The caller is not read here: reference data is the same rows for
  // everyone signed in, and the guard has already settled access.
  async findAll(query: QueryOperatorsInput): Promise<Paginated<unknown>> {
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
      rows.map((row) => ({ ...row, ...UNAVAILABLE_AGGREGATES })),
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
  async findOne(id: string) {
    const row = await this.prisma.operator.findFirst({
      where: { id },
      select: OPERATOR_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Operator not found');

    return {
      ...row,
      ...UNAVAILABLE_AGGREGATES,
      // The detail page's Fleet, Trips and Payments tabs read these. Empty
      // arrays rather than omitted keys, so the tabs render their own empty
      // state instead of crashing on undefined.
      fleet: [],
      tripHistory: [],
      payments: [],
    };
  }

  /** The four tiles above the operators table. */
  async stats() {
    const where: Prisma.OperatorWhereInput = { deletedAt: null };

    const [total, active, preferred] = await this.prisma.$transaction([
      this.prisma.operator.count({ where }),
      this.prisma.operator.count({
        where: { ...where, status: OperatorStatus.ACTIVE },
      }),
      this.prisma.operator.count({
        where: { ...where, status: OperatorStatus.PREFERRED },
      }),
    ]);

    return {
      total,
      active,
      preferred,
      inactive: total - active - preferred,
      // "Total Fleet" on the UI counts aircraft, which do not exist yet.
      totalFleet: null,
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

    return { ...operator, ...UNAVAILABLE_AGGREGATES };
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

    return { ...operator, ...UNAVAILABLE_AGGREGATES };
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

    return { ...operator, ...UNAVAILABLE_AGGREGATES };
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

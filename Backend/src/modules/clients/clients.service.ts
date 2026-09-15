import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { UserRole } from '../../generated/prisma/enums.js';
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
  homeAirport: true,
  leadSource: true,
  leadStage: true,
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
      ...equalsAny(query, ['type', 'leadStage', 'leadSource', 'assignedBrokerId']),
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

  async findOne(user: AuthenticatedUser, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      include: {
        assignedBroker: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        originatingBroker: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Deliberately 404 and not 403: a broker should not be able to confirm
    // that another broker's client exists by probing IDs.
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async create(user: AuthenticatedUser, input: CreateClientInput) {
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
    await this.findOne(user, id);

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

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.findOne(user, id);

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
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { paginate, type AuthenticatedUser, type Paginated } from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { equalsAny, orderByField, searchAcross } from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import { referenceFromSearch } from '../../common/database/document-number.js';
import { todayUtc } from '../../common/money/settlement.js';
import { Permission, Scope, isPartner, scopeFor } from '../../common/authorization/permissions.js';
import { TaskPriority, TaskStatus, UserStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ClientsService } from '../clients/clients.service.js';
import { TripsService } from '../trips/trips.service.js';
import { checklistProgress, completionStamp, readChecklist, taskAttention } from './tasks.rules.js';
import type { CreateTaskInput, QueryTasksInput, TaskView, UpdateTaskInput } from './dto/task.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

/** Explicit select, never a bare row spread. */
const TASK_LIST_SELECT = {
  id: true,
  reference: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  assigneeId: true,
  assignee: ACTOR_SELECT,
  clientId: true,
  client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
  tripId: true,
  trip: { select: { id: true, reference: true } },
  checklist: true,
  createdAt: true,
  createdById: true,
  createdBy: ACTOR_SELECT,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.TaskSelect;

const TASK_DETAIL_SELECT = {
  ...TASK_LIST_SELECT,
  description: true,
  notes: true,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.TaskSelect;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof TASK_LIST_SELECT }>;

/**
 * Tasks Board (#20) — desk work, written by a person.
 *
 * Scope is the permission matrix's VIEW_TASKS / MANAGE_TASKS: administrators
 * and senior brokers reach every task; a broker or an assistant reaches the
 * tasks assigned to them and the ones they wrote. Archiving a task somebody
 * else wrote is ALL only. A linked client or trip must be one the caller may
 * see, checked by the module that owns it.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clients: ClientsService,
    private readonly trips: TripsService,
  ) {}

  // ---- Scope ------------------------------------------------------------

  private scopeWhere(user: AuthenticatedUser, permission: Permission): Prisma.TaskWhereInput {
    if (scopeFor(user.role, permission) === Scope.ALL) return {};
    return { OR: [{ assigneeId: user.id }, { createdById: user.id }] };
  }

  private visibilityScope(user: AuthenticatedUser): Prisma.TaskWhereInput {
    return this.scopeWhere(user, Permission.VIEW_TASKS);
  }

  // ---- Shaping ----------------------------------------------------------

  private serialise<T extends TaskRow>(row: T, today: Date = todayUtc()) {
    const checklist = readChecklist(row.checklist);
    return {
      ...row,
      checklist,
      checklistProgress: checklistProgress(checklist),
      /** OVERDUE or DUE_TODAY, worked out now — never stored. */
      attention: row.deletedAt ? null : taskAttention(row.dueDate, row.status, today),
    };
  }

  // ---- Link checks ------------------------------------------------------

  /** A staff member who can be given work: not a partner, not suspended. */
  private async assertAssignee(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const person = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, status: true, deletedAt: true },
    });
    if (!person || person.deletedAt) throw new BadRequestException('That team member does not exist');
    if (isPartner(person.role)) throw new BadRequestException('A referral agent cannot be given desk tasks');
    if (person.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('That team member is suspended and cannot be given work');
    }
  }

  /**
   * A client or trip the caller may see, resolved by the module that owns it
   * — a 400 naming the problem, since the form needs a reason, not a 404.
   */
  private async assertLink(user: AuthenticatedUser, kind: 'client' | 'trip', id: string | null | undefined) {
    if (!id) return;
    let ref: { label: string; archived: boolean };
    try {
      ref = kind === 'client' ? await this.clients.subjectRef(user, id) : await this.trips.subjectRef(user, id);
    } catch (error) {
      if (error instanceof NotFoundException) throw new BadRequestException(`That ${kind} does not exist`);
      throw error;
    }
    if (ref.archived) throw new BadRequestException(`${ref.label} has been archived. Restore it first.`);
  }

  // ---- Reads ------------------------------------------------------------

  private viewWhere(user: AuthenticatedUser, view: TaskView | undefined, today: Date): Prisma.TaskWhereInput {
    const open = { status: { not: TaskStatus.COMPLETED } };
    const tomorrow = new Date(today.getTime() + DAY_MS);
    switch (view) {
      case 'MINE':
        return { assigneeId: user.id };
      case 'DUE_TODAY':
        return { ...open, dueDate: { gte: today, lt: tomorrow } };
      case 'OVERDUE':
        return { ...open, dueDate: { lt: today } };
      case 'ATTENTION':
        return { ...open, dueDate: { lt: tomorrow } };
      case 'HIGH_PRIORITY':
        return { priority: { in: [TaskPriority.HIGH, TaskPriority.URGENT] } };
      default:
        return {};
    }
  }

  /** The title and description, the task number ("TSK-1042"), the client and the trip ("TJ-1048"). */
  private searchWhere(term: string): Prisma.TaskWhereInput {
    const reference = referenceFromSearch(term, 'TSK');
    const trip = /^(?:TJ-?)?(\d{1,9})$/i.exec(term.trim());
    return {
      OR: [
        ...(reference !== null ? [{ reference }] : []),
        ...(trip ? [{ trip: { reference: Number(trip[1]) } }] : []),
        searchAcross(term, ['title', 'description']),
        { client: searchAcross(term, ['firstName', 'lastName', 'companyName']) },
      ],
    };
  }

  /**
   * The caller's own open tasks due before `before` — overdue and due today —
   * for the dashboard's priorities (#24). Assigned to them, not everything
   * they may see: a priorities list is one person's day, and an
   * administrator's would otherwise be the whole desk's backlog.
   */
  async dueForAssignee(user: AuthenticatedUser, before: Date, take: number) {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      assigneeId: user.id,
      status: { not: TaskStatus.COMPLETED },
      dueDate: { lt: before },
    };
    const today = todayUtc();
    const [rows, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        take,
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        select: TASK_LIST_SELECT,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { rows: rows.map((row) => this.serialise(row, today)), total };
  }

  async findAll(user: AuthenticatedUser, query: QueryTasksInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const today = query.on ?? todayUtc();
    const where: Prisma.TaskWhereInput = {
      AND: [
        archiveFilter(query.archived),
        this.visibilityScope(user),
        equalsAny(query, ['status', 'priority', 'assigneeId', 'clientId', 'tripId']),
        this.viewWhere(user, query.view, today),
        query.search ? this.searchWhere(query.search) : {},
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        // Undated work sits after dated work either way, and the number breaks
        // ties so a page boundary never swaps two tasks due the same day.
        orderBy:
          query.sortBy === 'dueDate'
            ? [{ dueDate: { sort: query.sortOrder, nulls: 'last' } }, { reference: 'desc' }]
            : [orderByField(query.sortBy, query.sortOrder), { reference: 'desc' }],
        select: TASK_LIST_SELECT,
      }),
      this.prisma.task.count({ where }),
    ]);

    return paginate(rows.map((row) => this.serialise(row, today)), total, query.page, query.limit);
  }

  /** Archived tasks included — the archived board opens them. */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.task.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: TASK_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Task not found');
    return this.serialise(row);
  }

  /** A live task the caller may work on, or 404 — including one they may only read. */
  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, ...this.scopeWhere(user, Permission.MANAGE_TASKS) },
      select: {
        id: true,
        reference: true,
        title: true,
        status: true,
        assigneeId: true,
        clientId: true,
        tripId: true,
        createdById: true,
      },
    });
    if (!row) throw new NotFoundException('Task not found');
    return row;
  }

  // ---- Writes -----------------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateTaskInput) {
    await Promise.all([
      this.assertAssignee(dto.assigneeId),
      this.assertLink(user, 'client', dto.clientId),
      this.assertLink(user, 'trip', dto.tripId),
    ]);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate,
        completedAt: dto.status === TaskStatus.COMPLETED ? new Date() : null,
        assigneeId: dto.assigneeId,
        clientId: dto.clientId,
        tripId: dto.tripId,
        checklist: dto.checklist,
        notes: dto.notes,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true, reference: true },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'task.created',
      entityType: 'Task',
      entityId: task.id,
      metadata: { reference: task.reference, title: dto.title, assigneeId: dto.assigneeId ?? null },
    });
    return this.findOne(user, task.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTaskInput) {
    const current = await this.findLive(user, id);

    // Validate a link only when it is actually changing (AGENTS.md): a task
    // whose client was archived later must still be editable.
    await Promise.all([
      dto.assigneeId !== undefined && dto.assigneeId !== current.assigneeId
        ? this.assertAssignee(dto.assigneeId)
        : undefined,
      dto.clientId !== undefined && dto.clientId !== current.clientId
        ? this.assertLink(user, 'client', dto.clientId)
        : undefined,
      dto.tripId !== undefined && dto.tripId !== current.tripId
        ? this.assertLink(user, 'trip', dto.tripId)
        : undefined,
    ]);

    const stamp = completionStamp(current.status, dto.status, new Date());
    await this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        ...(stamp !== undefined ? { completedAt: stamp } : {}),
        updatedById: user.id,
      },
    });

    const fields = Object.keys(dto).filter((key) => key !== 'status');
    if (dto.status !== undefined && dto.status !== current.status) {
      await this.audit.record({
        actorId: user.id,
        action: 'task.status_changed',
        entityType: 'Task',
        entityId: id,
        metadata: { reference: current.reference, from: current.status, to: dto.status },
      });
    }
    if (fields.length > 0) {
      await this.audit.record({
        actorId: user.id,
        action: 'task.updated',
        entityType: 'Task',
        entityId: id,
        metadata: { reference: current.reference, fields },
      });
    }
    return this.findOne(user, id);
  }

  /**
   * Archiving is narrower than editing: the person who wrote the task, or an
   * administrator. An assignee who thinks a task is wrong completes it or
   * says so; taking it off the board is its author's call.
   */
  private assertMayArchive(user: AuthenticatedUser, createdById: string | null): void {
    if (scopeFor(user.role, Permission.MANAGE_TASKS) === Scope.ALL) return;
    if (createdById !== user.id) {
      throw new ForbiddenException('Only whoever wrote this task, or an administrator, can archive it.');
    }
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const current = await this.findLive(user, id);
    this.assertMayArchive(user, current.createdById);
    await this.prisma.task.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'task.archived',
      entityType: 'Task',
      entityId: id,
      metadata: { reference: current.reference, title: current.title },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.task.findFirst({
      where: { id, deletedAt: { not: null }, ...this.scopeWhere(user, Permission.MANAGE_TASKS) },
      select: { id: true, reference: true, title: true, createdById: true },
    });
    if (!row) throw new NotFoundException('Archived task not found');
    this.assertMayArchive(user, row.createdById);
    await this.prisma.task.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'task.restored',
      entityType: 'Task',
      entityId: id,
      metadata: { reference: row.reference, title: row.title },
    });
    return this.findOne(user, id);
  }
}

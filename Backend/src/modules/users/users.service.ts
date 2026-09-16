import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { MailService } from '../../core/mail/mail.service.js';
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
  ASSIGNABLE_ROLES,
  PERMISSION_LABELS,
  Permission,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSION_LEVEL,
  Scope,
  permissionsFor,
  scopeFor,
} from '../../common/authorization/permissions.js';
import { UserRole, UserStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  InviteUserInput,
  QueryUsersInput,
  UpdateUserInput,
} from './dto/user.dto.js';

/**
 * Explicit select, never a bare row spread.
 *
 * `passwordHash` and `twoFactorSecret` live on this model, and spreading a
 * Prisma user into a response would leak both. Listing columns means a column
 * added later is invisible until someone deliberately exposes it.
 */
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  avatarKey: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
} satisfies Prisma.UserSelect;

/** Who made the record, and who last touched it. */
const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const USER_DETAIL_SELECT = {
  ...USER_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
  _count: {
    select: { assignedClients: true, originatedClients: true },
  },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /**
   * Row-level visibility for the directory.
   *
   * Anyone signed in may see who their colleagues are — the assigned-broker
   * dropdown on the client form depends on it, and a staff directory is not
   * sensitive. What varies is the *detail*: only MANAGE_USERS holders get
   * status, last-login and the audit trail. See `projectFor`.
   */
  private visibilityScope(user: AuthenticatedUser): Prisma.UserWhereInput {
    const scope = scopeFor(user.role, Permission.MANAGE_USERS);
    if (scope === Scope.ALL) return {};

    // Without MANAGE_USERS a caller sees only accounts that can be worked
    // with: suspended and invited colleagues are administrative state.
    return { status: UserStatus.ACTIVE };
  }

  /**
   * Strips administrative fields for callers who cannot manage users, so the
   * broker filling in an "Assigned Broker" dropdown gets names, not the team's
   * login history.
   */
  private projectFor(user: AuthenticatedUser, row: UserRow) {
    const canManage = scopeFor(user.role, Permission.MANAGE_USERS) === Scope.ALL;
    if (canManage || row.id === user.id) {
      return { ...row, permissionLevel: ROLE_PERMISSION_LEVEL[row.role] };
    }
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      avatarKey: row.avatarKey,
    };
  }

  async findAll(
    user: AuthenticatedUser,
    query: QueryUsersInput,
  ): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);

    // Accounts are never removed — suspending is the way out — so the only
    // rows `deletedAt` still hides are legacy ones archived before the feature
    // was withdrawn. Auth checks the same column, so a stamped row also cannot
    // sign in.
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...this.visibilityScope(user),
      ...equalsAny(query, ['role', 'status']),
      ...searchAcross(query.search, ['firstName', 'lastName', 'email']),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        // `sortBy` is narrowed to USER_SORTABLE_FIELDS by the DTO, so no
        // caller-supplied string can reach the ORDER BY clause.
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.projectFor(user, row)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: USER_DETAIL_SELECT,
    });

    // 404 rather than 403 for a row outside the caller's scope: a 403 would
    // confirm the account exists and turn any id into an existence oracle.
    if (!row) throw new NotFoundException('User not found');

    return this.projectFor(user, row as UserRow);
  }

  /** The four tiles above the users table. */
  async stats(user: AuthenticatedUser) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...this.visibilityScope(user),
    };

    const [total, active, invited, suspended, byRole] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { ...where, status: UserStatus.INVITED } }),
      this.prisma.user.count({
        where: { ...where, status: UserStatus.SUSPENDED },
      }),
      this.prisma.user.groupBy({ by: ['role'], where, _count: { _all: true } }),
    ]);

    const counts = Object.fromEntries(
      byRole.map((entry) => [entry.role, entry._count._all]),
    ) as Record<UserRole, number | undefined>;

    return {
      total,
      active,
      invited,
      suspended,
      admins:
        (counts[UserRole.SUPER_ADMIN] ?? 0) + (counts[UserRole.ADMIN] ?? 0),
      seniorBrokers: counts[UserRole.SENIOR_BROKER] ?? 0,
      brokers: counts[UserRole.BROKER] ?? 0,
      assistants: counts[UserRole.ASSISTANT] ?? 0,
    };
  }

  /**
   * Powers the Roles & Permissions tab.
   *
   * Served from the matrix rather than hardcoded in the frontend, so the table
   * an administrator reads is generated from the rules the API actually
   * enforces. A UI copy of this table would drift the first time a permission
   * changed, and would then be actively misleading.
   */
  async rolesOverview(user: AuthenticatedUser) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...this.visibilityScope(user),
    };
    const byRole = await this.prisma.user.groupBy({
      by: ['role'],
      where,
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      byRole.map((entry) => [entry.role, entry._count._all]),
    ) as Record<string, number | undefined>;

    const roles = Object.values(UserRole).map((role) => ({
      role,
      label: role,
      permissionLevel: ROLE_PERMISSION_LEVEL[role],
      description: ROLE_DESCRIPTIONS[role],
      userCount: counts[role] ?? 0,
      assignable: ASSIGNABLE_ROLES.includes(role),
      permissions: permissionsFor(role),
    }));

    const matrix = Object.values(Permission).map((permission) => ({
      permission,
      label: PERMISSION_LABELS[permission],
      scopes: Object.fromEntries(
        Object.values(UserRole).map((role) => [role, scopeFor(role, permission)]),
      ) as Record<UserRole, Scope>,
    }));

    return { roles, matrix, scopes: Object.values(Scope) };
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Guards that protect the system from its own administrators.
   *
   * Without these an admin can lock everyone out: demote the last admin,
   * suspend themselves, or delete the owner account. Each one is a real
   * incident that is unrecoverable through the API.
   */
  private assertMayAdminister(
    actor: AuthenticatedUser,
    target: { id: string; role: UserRole },
  ): void {
    if (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('The owner account cannot be modified');
    }
  }

  /**
   * An invited account's status is not an administrator's to set.
   *
   * It leaves INVITED exactly once, when the invitee accepts by setting their
   * password. Suspending a pending invitation would strand the row for good:
   * the invitee cannot sign in, and `completePasswordReset` only promotes an
   * account that is still INVITED, so nothing could ever move it again.
   *
   * Note that with account removal withdrawn, a mistaken invitation currently
   * has no way out at all — it stays INVITED and keeps its email address
   * reserved. Withdrawing an invitation needs its own deliberate operation.
   */
  private assertStatusChangeAllowed(
    target: { status: UserStatus },
    dto: UpdateUserInput,
  ): void {
    if (dto.status === undefined || target.status !== UserStatus.INVITED) return;

    throw new BadRequestException(
      'This invitation has not been accepted yet, so its status cannot be changed. The account activates itself when the user sets their password.',
    );
  }

  private assertNotSelfDemotion(
    actor: AuthenticatedUser,
    targetId: string,
    dto: UpdateUserInput,
  ): void {
    if (targetId !== actor.id) return;

    if (dto.role && dto.role !== actor.role) {
      throw new BadRequestException(
        'You cannot change your own role. Ask another administrator.',
      );
    }
    if (dto.status && dto.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
  }

  /**
   * Refuses to remove the last account that can still manage users.
   *
   * Counted against the live database rather than inferred from the request,
   * because two administrators demoting each other concurrently would each
   * individually look safe.
   */
  private async assertNotLastAdministrator(
    targetId: string,
    next: { role?: UserRole; status?: UserStatus },
  ): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true, status: true },
    });
    if (!target) return;

    const wasAdmin =
      target.role === UserRole.SUPER_ADMIN || target.role === UserRole.ADMIN;
    if (!wasAdmin || target.status !== UserStatus.ACTIVE) return;

    const stillAdmin =
      next.role === undefined
        ? wasAdmin
        : next.role === UserRole.SUPER_ADMIN || next.role === UserRole.ADMIN;
    const stillActive =
      next.status === undefined ? true : next.status === UserStatus.ACTIVE;

    if (stillAdmin && stillActive) return;

    const remaining = await this.prisma.user.count({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
        id: { not: targetId },
      },
    });

    if (remaining === 0) {
      throw new BadRequestException(
        'This is the last active administrator. Promote another user first.',
      );
    }
  }

  async invite(actor: AuthenticatedUser, dto: InviteUserInput) {
    /**
     * Email is unique across the whole table, archived rows included, so the
     * check ignores `deletedAt`: nothing archives a user any more, and the few
     * legacy archived rows must still not have their address handed out twice.
     */
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }

    /**
     * A random, discarded password. The account is unusable until the invitee
     * completes the password-reset flow, so no human ever sees or transmits a
     * credential. Hashed like any other so the column shape stays uniform and
     * a login attempt takes the same time as a real one.
     */
    const placeholder = await argon2.hash(randomBytes(32).toString('hex'), {
      type: argon2.argon2id,
    });

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        passwordHash: placeholder,
        status: UserStatus.INVITED,
        createdById: actor.id,
        updatedById: actor.id,
      },
      select: USER_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'user.invited',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    const delivered = await this.sendInvitation(actor, user.email, user.firstName);

    return {
      user: { ...user, permissionLevel: ROLE_PERMISSION_LEVEL[user.role] },
      invitation: delivered,
    };
  }

  /**
   * Mirrors the auth module's behaviour: with SMTP configured a real email
   * goes out, and without it the response says so plainly instead of failing
   * silently and leaving the invitee waiting for a mail that never sent.
   */
  private async sendInvitation(
    actor: AuthenticatedUser,
    email: string,
    firstName: string,
  ) {
    await this.mail.sendInvitation(email, firstName, actor.email);

    if (this.mail.driverName === 'log') {
      return {
        emailSent: false,
        notice:
          'SMTP is not configured, so no invitation email was sent. Ask the user to open the sign-in page and use "Forgot password?" with this email address — setting their password accepts the invitation and activates the account.',
      };
    }
    return { emailSent: true, notice: null };
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserInput) {
    const target = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: true, status: true, email: true },
    });
    if (!target) throw new NotFoundException('User not found');

    this.assertMayAdminister(actor, target);
    this.assertStatusChangeAllowed(target, dto);
    this.assertNotSelfDemotion(actor, id, dto);
    await this.assertNotLastAdministrator(id, {
      role: dto.role,
      status: dto.status,
    });

    const user = await this.prisma.user.update({
      where: { id },
      // `updatedById` is set here rather than left to the caller: an audit
      // column that a caller can supply is not an audit column.
      data: { ...dto, updatedById: actor.id },
      select: USER_SELECT,
    });

    // Record what actually changed, not the whole payload — an audit entry
    // claiming a role change that did not happen is worse than none.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (dto.role && dto.role !== target.role) {
      changes.role = { from: target.role, to: dto.role };
    }
    if (dto.status && dto.status !== target.status) {
      changes.status = { from: target.status, to: dto.status };
    }

    await this.audit.record({
      actorId: actor.id,
      action: Object.keys(changes).length ? 'user.access_changed' : 'user.updated',
      entityType: 'User',
      entityId: id,
      metadata: { email: target.email, changes, fields: Object.keys(dto) },
    });

    return { ...user, permissionLevel: ROLE_PERMISSION_LEVEL[user.role] };
  }
}

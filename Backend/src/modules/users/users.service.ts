import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { MailService } from '../../core/mail/mail.service.js';
import { TripsService } from '../trips/trips.service.js';
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
  actsAs,
  permissionsFor,
  scopeFor,
} from '../../common/authorization/permissions.js';
import {
  CommissionBasis,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  InviteUserInput,
  QueryUsersInput,
  UpdateUserInput,
} from './dto/user.dto.js';
import { AuthService } from '../auth/auth.service.js';

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
  commissionBasis: true,
  commissionPercentage: true,
  commissionAmount: true,
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

const toNumber = (value: Prisma.Decimal | null) =>
  value === null ? null : Number(value);

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    // Trips (#11)'s second pass: active trips per person on the team table.
    private readonly trips: TripsService,
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
      return {
        ...row,
        // Decimals serialise as strings; the screen wants numbers, and null
        // stays null — "no structure set" is not a 0% commission.
        commissionPercentage: toNumber(row.commissionPercentage),
        commissionAmount: toNumber(row.commissionAmount),
        permissionLevel: ROLE_PERMISSION_LEVEL[row.role],
      };
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

    // Active trips per person, one grouped query — a real 0 for someone with
    // none on the board, never a placeholder.
    const activeTrips = await this.trips.activeCountByBroker(rows.map((row) => row.id));
    return paginate(
      rows.map((row) => ({ ...this.projectFor(user, row), activeTrips: activeTrips.get(row.id) ?? 0 })),
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

    const activeTrips = await this.trips.activeCountByBroker([row.id]);
    return { ...this.projectFor(user, row as UserRow), activeTrips: activeTrips.get(row.id) ?? 0 };
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
    if (target.role === UserRole.SUPER_ADMIN && actsAs(actor.role) !== UserRole.SUPER_ADMIN) {
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

    // The first password, chosen by the inviter and mailed with the
    // invitation. Hashed exactly as every other password is.
    const passwordHash = await AuthService.hashPassword(dto.password);

    const { commissionBasis, commissionPercentage, commissionAmount, password, ...profile } = dto;
    const commission = this.commissionStructure(dto.role, {
      commissionBasis,
      commissionPercentage,
      commissionAmount,
    });

    const user = await this.prisma.user.create({
      data: {
        ...profile,
        ...commission,
        passwordHash,
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

    const delivered = await this.sendInvitation(actor, user.email, user.firstName, password);

    return {
      // The inviter manages users, so this is the full projection — with the
      // commission figures as numbers, as every other Users response sends them.
      user: this.projectFor(actor, user),
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
    password: string,
  ) {
    // The invitee reads a name, not an address; the email is the fallback.
    const inviter = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { firstName: true, lastName: true },
    });
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : '';
    await this.mail.sendInvitation(email, firstName, inviterName || actor.email, password);

    if (this.mail.driverName === 'log') {
      return {
        emailSent: false,
        notice:
          'SMTP is not configured, so no invitation email was sent. Give the user their email address and the password you set — their first sign-in activates the account.',
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
    const commission = this.commissionStructure(target.role, dto);

    // The structure is written from the validated columns above, never as sent.
    const fields: Partial<UpdateUserInput> = { ...dto };
    delete fields.commissionBasis;
    delete fields.commissionPercentage;
    delete fields.commissionAmount;
    const user = await this.prisma.user.update({
      where: { id },
      // `updatedById` is set here rather than left to the caller: an audit
      // column that a caller can supply is not an audit column.
      data: { ...fields, ...commission, updatedById: actor.id },
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

    return this.projectFor(actor, user);
  }

  /**
   * A referral agent's standard commission (#11), as the columns to write.
   *
   * Only a REFERRAL_AGENT carries one: on any other role it would be a figure
   * nothing reads, waiting to confuse whoever finds it. Moving an agent to a
   * desk role clears it; the commissions already raised keep their own copy.
   *
   * The basis decides which figure is required — a percentage of profit
   * needs its percentage, a flat fee its amount — and the other is cleared,
   * so the row never holds a rate it is not using.
   */
  private commissionStructure(currentRole: UserRole, dto: UpdateUserInput) {
    const role = dto.role ?? currentRole;
    const touched =
      dto.commissionBasis !== undefined ||
      dto.commissionPercentage !== undefined ||
      dto.commissionAmount !== undefined;

    if (role !== UserRole.REFERRAL_AGENT) {
      if (touched && (dto.commissionBasis || dto.commissionPercentage || dto.commissionAmount)) {
        throw new BadRequestException('Only a referral agent has a commission structure.');
      }
      return currentRole === UserRole.REFERRAL_AGENT
        ? { commissionBasis: null, commissionPercentage: null, commissionAmount: null }
        : {};
    }
    if (!touched) return {};

    const basis = dto.commissionBasis;
    if (basis === null) {
      return { commissionBasis: null, commissionPercentage: null, commissionAmount: null };
    }
    if (basis === undefined) {
      throw new BadRequestException('Send commissionBasis with the percentage or amount it uses.');
    }
    if (basis === CommissionBasis.PERCENT_OF_PROFIT) {
      if (dto.commissionPercentage == null) {
        throw new BadRequestException('A percentage-of-profit commission needs its percentage.');
      }
      return { commissionBasis: basis, commissionPercentage: dto.commissionPercentage, commissionAmount: null };
    }
    if (basis === CommissionBasis.FLAT_FEE) {
      if (dto.commissionAmount == null) {
        throw new BadRequestException('A flat-fee commission needs its amount.');
      }
      return { commissionBasis: basis, commissionPercentage: null, commissionAmount: dto.commissionAmount };
    }
    // CUSTOM: agreed per referral, so there is no standing figure to keep.
    return { commissionBasis: basis, commissionPercentage: null, commissionAmount: null };
  }
}

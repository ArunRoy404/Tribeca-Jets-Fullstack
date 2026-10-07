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
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSION_LEVEL,
} from '../../common/authorization/permissions.js';
import {
  Action,
  Module,
  canDo,
  defaultGrants,
  normaliseGrants,
  resolveAccess,
  roleDefaults,
  type AccessGrants,
  type AccessMap,
} from '../../common/authorization/access.js';
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
  permissions: true,
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

  /** Whether the caller may open the Users & Roles screen. */
  private seesTeamAdmin(user: AuthenticatedUser): boolean {
    return canDo(user.access, Module.USERS, Action.VIEW);
  }

  /**
   * Row-level visibility for the directory.
   *
   * Anyone signed in may see who their colleagues are — the assigned-broker
   * dropdown on the client form depends on it, and a staff directory is not
   * sensitive. What varies is the *detail*: only someone with Users & Roles
   * gets status, last-login, permissions and the audit trail. See
   * `projectFor`.
   */
  private visibilityScope(user: AuthenticatedUser): Prisma.UserWhereInput {
    if (this.seesTeamAdmin(user)) return {};

    // Without it a caller sees only accounts that can be worked with:
    // suspended and invited colleagues are administrative state.
    return { status: UserStatus.ACTIVE };
  }

  /**
   * Strips administrative fields for callers without Users & Roles, so the
   * broker filling in an "Assigned Broker" dropdown gets names, not the
   * team's login history or permissions.
   */
  private projectFor(user: AuthenticatedUser, row: UserRow) {
    if (this.seesTeamAdmin(user) || row.id === user.id) {
      const { permissions, ...rest } = row;
      return {
        ...rest,
        // The effective set — the stored ticks within what the role allows,
        // with the role's reach — never the raw JSON.
        permissions: resolveAccess(row.role, permissions),
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
      brokers: counts[UserRole.BROKER] ?? 0,
      assistants: counts[UserRole.ASSISTANT] ?? 0,
    };
  }

  /**
   * Powers the Roles & Permissions tab: each role's card and its defaults,
   * locks and reach, module by module — generated from `access.roles.ts`, so
   * the table an administrator reads is the rule the API applies.
   */
  async rolesOverview(user: AuthenticatedUser) {
    const byRole = await this.prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null, ...this.visibilityScope(user) },
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      byRole.map((entry) => [entry.role, entry._count._all]),
    ) as Record<string, number | undefined>;

    return {
      roles: Object.values(UserRole).map((role) => ({
        ...roleDefaults(role),
        permissionLevel: ROLE_PERMISSION_LEVEL[role],
        description: ROLE_DESCRIPTIONS[role],
        userCount: counts[role] ?? 0,
        assignable: ASSIGNABLE_ROLES.includes(role),
      })),
    };
  }

  /** One role's form view, for the invite and edit forms. */
  roleDefaults(role: UserRole) {
    return roleDefaults(role);
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
    // The actor's real role: Users & Roles is on the per-user permissions
    // (7 Oct 2026), so the temporary everyone-is-owner switch no longer
    // reaches this guard.
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

    // The first password, chosen by the inviter and mailed with the
    // invitation. Hashed exactly as every other password is.
    const passwordHash = await AuthService.hashPassword(dto.password);

    const { commissionBasis, commissionPercentage, commissionAmount, password, permissions, ...profile } = dto;
    const grants = this.grantsFor(actor, dto.role, permissions);
    const commission = this.commissionStructure(dto.role, {
      commissionBasis,
      commissionPercentage,
      commissionAmount,
    });

    const user = await this.prisma.user.create({
      data: {
        ...profile,
        ...commission,
        permissions: grants as Prisma.InputJsonValue,
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
      metadata: { email: user.email, role: user.role, permissions: grants },
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
      select: { id: true, role: true, status: true, email: true, permissions: true },
    });
    if (!target) throw new NotFoundException('User not found');

    this.assertMayAdminister(actor, target);
    this.assertStatusChangeAllowed(target, dto);
    this.assertNotSelfDemotion(actor, id, dto);
    const grants = this.nextGrants(actor, target, dto);
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
    delete fields.permissions;
    const user = await this.prisma.user.update({
      where: { id },
      // `updatedById` is set here rather than left to the caller: an audit
      // column that a caller can supply is not an audit column.
      data: {
        ...fields,
        ...commission,
        ...(grants ? { permissions: grants as Prisma.InputJsonValue } : {}),
        updatedById: actor.id,
      },
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
    if (grants) {
      const diff = permissionDiff(
        resolveAccess(target.role, target.permissions),
        resolveAccess(user.role, grants),
      );
      if (diff.granted.length || diff.removed.length) {
        changes.permissions = { from: diff.removed, to: diff.granted };
      }
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
   * The permissions a new account is created with: its role's defaults, or
   * what the inviter ticked — which needs Users & Roles · Change roles &
   * permissions, and is checked against the role's locks and against what
   * the inviter holds themselves.
   */
  private grantsFor(actor: AuthenticatedUser, role: UserRole, input: AccessGrants | undefined): AccessGrants {
    if (input !== undefined) this.assertMayManageAccess(actor);
    // The defaults are checked against the inviter too: inviting an
    // administrator would otherwise be a way to mint access you do not hold.
    return normaliseGrants(role, input ?? defaultGrants(role), this.grantor(actor)).grants;
  }

  private grantor(actor: AuthenticatedUser) {
    return { role: actor.role, access: actor.access ?? {} };
  }

  /**
   * The permissions an edit leaves the account with, or undefined when it
   * does not touch them. A role change without a permission set resets to the
   * new role's defaults — the old role's ticks may hold what the new role can
   * never have. The owner's are never edited, and nobody edits their own:
   * that would be a way to grant yourself anything.
   */
  private nextGrants(
    actor: AuthenticatedUser,
    target: { id: string; role: UserRole },
    dto: UpdateUserInput,
  ): AccessGrants | undefined {
    const roleChanges = dto.role !== undefined && dto.role !== target.role;
    if (dto.permissions === undefined && !roleChanges) return undefined;

    this.assertMayManageAccess(actor);
    if (target.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('The owner account always has every permission.');
    }
    if (target.id === actor.id && dto.permissions !== undefined) {
      throw new BadRequestException('You cannot change your own permissions. Ask another administrator.');
    }

    const role = dto.role ?? target.role;
    return normaliseGrants(role, dto.permissions ?? defaultGrants(role), this.grantor(actor)).grants;
  }

  private assertMayManageAccess(actor: AuthenticatedUser): void {
    if (!canDo(actor.access, Module.USERS, Action.MANAGE_ACCESS)) {
      throw new ForbiddenException(
        'You do not have permission for Users & Roles · Change roles & permissions',
      );
    }
  }

  /**
   * Withdraws an invitation nobody accepted: **the one permanent delete in
   * this system** (owner's decision, 7 Oct 2026).
   *
   * It is allowed because a pending invitee has no history — they never
   * signed in, so nothing in the CRM was written by them — and leaving the
   * row would keep a mistyped address reserved for ever. An account that has
   * signed in is never deleted; suspending it is the way out.
   *
   * Refused while anything has been put on the person: a user row is linked
   * from clients, trips, quotes, tasks and more, most of which would silently
   * lose the link on delete, and the documents filed in their folder would be
   * deleted with them. The refusal names what to move first. The audit trail
   * keeps the invitation and its withdrawal.
   */
  async withdrawInvitation(actor: AuthenticatedUser, id: string) {
    const target = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        _count: {
          select: {
            assignedClients: true,
            originatedClients: true,
            assignedTripRequests: true,
            assignedQuotes: true,
            assignedTrips: true,
            assignedTasks: true,
            assignedReferrals: true,
            submittedReferrals: true,
            commissionsReceived: true,
            brokerCommissions: true,
            ownedUploads: true,
            uploads: true,
            sentEmails: true,
            sentItineraries: true,
          },
        },
      },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.status !== UserStatus.INVITED) {
      throw new BadRequestException(
        'Only an invitation that has not been accepted can be withdrawn. Suspend an account that has signed in.',
      );
    }

    const counts = target._count;
    const attached = [
      [counts.assignedClients + counts.originatedClients, 'client'],
      [counts.assignedTripRequests, 'trip request'],
      [counts.assignedQuotes, 'quote'],
      [counts.assignedTrips, 'trip'],
      [counts.assignedTasks, 'task'],
      [counts.assignedReferrals + counts.submittedReferrals, 'referral'],
      [counts.commissionsReceived + counts.brokerCommissions, 'commission'],
      [counts.ownedUploads + counts.uploads, 'document in their folder'],
      [counts.sentEmails + counts.sentItineraries, 'sent email'],
    ]
      .filter(([count]) => (count as number) > 0)
      .map(([count, noun]) => `${count} ${noun}${count === 1 ? '' : 's'}`);
    if (attached.length) {
      throw new ConflictException(
        `This invitation has records attached: ${attached.join(', ')}. Reassign or remove them first.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.verificationCode.deleteMany({ where: { userId: id } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    await this.audit.record({
      actorId: actor.id,
      action: 'user.invitation_withdrawn',
      entityType: 'User',
      entityId: id,
      metadata: { email: target.email, role: target.role },
    });

    return { id, email: target.email, withdrawn: true };
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

/** "QUOTES.SEND"-style lists of what an edit granted and took away, for the audit trail. */
function permissionDiff(before: AccessMap, after: AccessMap) {
  const flatten = (map: AccessMap) =>
    new Set(
      Object.entries(map).flatMap(([module, grant]) =>
        (grant?.actions ?? []).map((action) => `${module}.${action}`),
      ),
    );
  const was = flatten(before);
  const now = flatten(after);
  return {
    granted: [...now].filter((key) => !was.has(key)),
    removed: [...was].filter((key) => !now.has(key)),
  };
}

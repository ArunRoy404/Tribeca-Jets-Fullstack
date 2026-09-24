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
  can,
  canWrite,
} from '../../common/authorization/permissions.js';
import { CreditEntryType } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ClientsService } from '../clients/clients.service.js';
import {
  fromCents,
  overdraws,
  summarise,
  toCents,
  type CreditSummary,
} from './client-credits.balance.js';
import type {
  CreateClientCreditInput,
  QueryClientCreditsInput,
  UpdateClientCreditInput,
} from './dto/client-credit.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

/** Explicit select, never a bare row spread. */
const CREDIT_SELECT = {
  id: true,
  clientId: true,
  type: true,
  amount: true,
  occurredAt: true,
  reason: true,
  reference: true,
  createdAt: true,
  createdById: true,
  createdBy: ACTOR_SELECT,
  updatedAt: true,
  updatedById: true,
  updatedBy: ACTOR_SELECT,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.ClientCreditSelect;

type CreditRow = { amount: Prisma.Decimal };

@Injectable()
export class ClientCreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clients: ClientsService,
  ) {}

  /**
   * `amount` is a Prisma `Decimal`, which serialises as a string. The profile
   * formats it as money, so it is converted once here rather than in every
   * caller — the same treatment trip requests give `estimatedValue`.
   */
  private serialise<T extends CreditRow>(row: T) {
    return { ...row, amount: Number(row.amount) };
  }

  /**
   * Every entry point starts here.
   *
   * Two separate questions, and collapsing them is how money leaks:
   *
   * 1. **May this role see financials at all?** `VIEW_FINANCIALS` — an
   *    assistant holds NONE, so they never learn what a client has on account,
   *    even for a client they can otherwise read. That is a capability
   *    failure, so 403.
   * 2. **May they see *this* client?** Asked of the clients module, which
   *    applies the same broker scope it applies everywhere else. Out of scope
   *    is 404, never 403 — a 403 would confirm the client exists.
   *
   * There is deliberately no MANAGE_CLIENT_CREDIT permission. The matrix
   * already says exactly who may see money and at what reach, and a second
   * permission whose row would be identical is a row nobody maintains.
   */
  private async client(user: AuthenticatedUser, clientId: string) {
    if (!can(user.role, Permission.VIEW_FINANCIALS)) {
      throw new ForbiddenException(
        'Your role cannot see what a client has on account',
      );
    }
    return this.clients.subjectRef(user, clientId);
  }

  private assertMayWrite(user: AuthenticatedUser): void {
    // `canWrite` rather than `can`, so that if VIEW_FINANCIALS is ever given a
    // READ scope for some role, that role becomes read-only here without this
    // file changing.
    if (!canWrite(user.role, Permission.VIEW_FINANCIALS)) {
      throw new ForbiddenException(
        "Your role cannot change a client's money on account",
      );
    }
  }

  /**
   * An archived client's ledger is readable and not writable — the same split
   * `findOne` and `findLive` make everywhere else. The Archived tab links to
   * the profile, and what a closed account was owed is exactly what somebody
   * has come to check; but booking new money against a client the desk has
   * closed writes a balance nobody is watching.
   *
   * 400 rather than 404, because the caller has just read this client.
   */
  private assertClientLive(subject: { archived: boolean }): void {
    if (!subject.archived) return;
    throw new BadRequestException(
      'That client has been archived. Restore them before changing their account.',
    );
  }

  /**
   * The ledger balance, in integer cents.
   *
   * **Summed, never stored.** There is no balance column, for the same reason
   * a quote has no stored total: the day an edit moves one entry and the
   * stored figure does not follow, the record contradicts itself and nothing
   * on screen says which half is right.
   *
   * `excludeId` exists for edits — the row being changed must not count
   * towards the balance its new value is checked against, or raising an
   * application by $1 is measured against a balance that still contains the
   * old one.
   */
  private async balanceCentsFor(
    clientId: string,
    excludeId?: string,
  ): Promise<number> {
    const sums = await this.prisma.clientCredit.groupBy({
      by: ['type'],
      where: {
        clientId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      _sum: { amount: true },
    });

    const totalFor = (type: CreditEntryType) =>
      toCents(sums.find((row) => row.type === type)?._sum.amount ?? 0);

    return (
      totalFor(CreditEntryType.CREDIT) - totalFor(CreditEntryType.APPLICATION)
    );
  }

  /**
   * Refuses a movement that would take the account below zero.
   *
   * A client cannot spend money they are not holding, so an application beyond
   * the balance is a typo — an extra zero, or the same cancellation entered
   * twice. The message names the balance, because "that is too much" without
   * saying too much *than what* sends somebody to a spreadsheet.
   */
  private assertWithinBalance(
    balanceCents: number,
    entry: { type: CreditEntryType; amount: number },
  ): void {
    const amountCents = toCents(entry.amount);
    if (!overdraws(balanceCents, { type: entry.type, amountCents })) return;

    const available = fromCents(balanceCents).toFixed(2);
    throw new BadRequestException(
      `That is more than this client has on account. Available: ${available}.`,
    );
  }

  async findAll(
    user: AuthenticatedUser,
    query: QueryClientCreditsInput,
  ): Promise<Paginated<unknown>> {
    await this.client(user, query.clientId);
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.ClientCreditWhereInput = {
      clientId: query.clientId,
      ...archiveFilter(query.archived),
      ...equalsAny(query, ['type']),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.clientCredit.findMany({
        where,
        select: CREDIT_SELECT,
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.clientCredit.count({ where }),
    ]);

    return paginate(
      items.map((row) => this.serialise(row)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * What the profile section shows above the ledger.
   *
   * Archived entries are excluded from every figure here: a withdrawn movement
   * is one somebody took back, and counting it would make the balance disagree
   * with the rows printed underneath it.
   */
  async summary(
    user: AuthenticatedUser,
    clientId: string,
  ): Promise<CreditSummary & { entries: number; lastMovementAt: Date | null }> {
    await this.client(user, clientId);

    const where: Prisma.ClientCreditWhereInput = { clientId, deletedAt: null };
    const [sums, entries, latest] = await this.prisma.$transaction([
      this.prisma.clientCredit.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
      this.prisma.clientCredit.count({ where }),
      this.prisma.clientCredit.findFirst({
        where,
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      }),
    ]);

    const totalFor = (type: CreditEntryType) =>
      toCents(sums.find((row) => row.type === type)?._sum.amount ?? 0);

    return {
      ...summarise(
        totalFor(CreditEntryType.CREDIT),
        totalFor(CreditEntryType.APPLICATION),
      ),
      entries,
      lastMovementAt: latest?.occurredAt ?? null,
    };
  }

  /** Archived entries load here too, so the Archived view can link to them. */
  async findOne(user: AuthenticatedUser, id: string) {
    const { entry } = await this.load(user, id);
    return entry;
  }

  /**
   * One entry together with the client it belongs to.
   *
   * Resolving the client is what enforces the row-level rule — the entry's own
   * id says nothing about who may read it — so every caller needs both, and
   * returning the pair fetches the client once per request.
   */
  private async load(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.clientCredit.findUnique({
      where: { id },
      select: CREDIT_SELECT,
    });
    if (!row) throw new NotFoundException('That credit entry does not exist');

    const client = await this.client(user, row.clientId);
    return { entry: this.serialise(row), client };
  }

  async create(user: AuthenticatedUser, dto: CreateClientCreditInput) {
    const client = await this.client(user, dto.clientId);
    this.assertMayWrite(user);
    this.assertClientLive(client);

    const balanceCents = await this.balanceCentsFor(dto.clientId);
    this.assertWithinBalance(balanceCents, dto);

    const entry = await this.prisma.clientCredit.create({
      data: {
        clientId: dto.clientId,
        type: dto.type,
        amount: dto.amount,
        occurredAt: dto.occurredAt,
        reason: dto.reason ?? null,
        reference: dto.reference ?? null,
        createdById: user.id,
        updatedById: user.id,
      },
      select: CREDIT_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'client_credit.created',
      entityType: 'ClientCredit',
      entityId: entry.id,
      metadata: {
        clientId: dto.clientId,
        client: client.label,
        type: entry.type,
        amount: Number(entry.amount),
      },
    });

    return this.serialise(entry);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateClientCreditInput,
  ) {
    const { entry: target, client } = await this.load(user, id);
    this.assertMayWrite(user);
    this.assertClientLive(client);
    if (target.deletedAt) {
      throw new BadRequestException(
        'That entry has been withdrawn. Restore it before editing.',
      );
    }

    // Measured against the ledger *without* this row, or raising an
    // application by a pound is checked against a balance that still contains
    // its old value.
    const balanceCents = await this.balanceCentsFor(target.clientId, id);
    this.assertWithinBalance(balanceCents, {
      type: dto.type ?? target.type,
      amount: dto.amount ?? target.amount,
    });

    const entry = await this.prisma.clientCredit.update({
      where: { id },
      data: { ...dto, updatedById: user.id },
      select: CREDIT_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'client_credit.updated',
      entityType: 'ClientCredit',
      entityId: id,
      metadata: {
        clientId: target.clientId,
        fields: Object.keys(dto),
        ...(dto.amount !== undefined && dto.amount !== target.amount
          ? { amount: { from: target.amount, to: dto.amount } }
          : {}),
      },
    });

    return this.serialise(entry);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const { entry: target, client } = await this.load(user, id);
    this.assertMayWrite(user);
    this.assertClientLive(client);
    if (target.deletedAt) {
      throw new NotFoundException('That entry has already been withdrawn');
    }

    await this.prisma.clientCredit.update({
      where: { id },
      data: { ...archiveData(user.id), updatedById: user.id },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'client_credit.removed',
      entityType: 'ClientCredit',
      entityId: id,
      metadata: {
        clientId: target.clientId,
        type: target.type,
        amount: target.amount,
      },
    });
  }

  /**
   * Restoring re-checks the balance, because the ledger has moved on.
   *
   * A $12,000 application withdrawn in March and restored in June lands on
   * whatever the account holds now — and if the credit behind it was spent
   * meanwhile, putting it back would overdraw the client. The check that
   * refuses it at creation has to refuse it here too, or the guard is one a
   * withdraw-and-restore walks straight around.
   */
  async restore(user: AuthenticatedUser, id: string) {
    const { entry: target, client } = await this.load(user, id);
    this.assertMayWrite(user);
    this.assertClientLive(client);
    if (!target.deletedAt) {
      throw new NotFoundException('That entry is not withdrawn');
    }

    const balanceCents = await this.balanceCentsFor(target.clientId, id);
    this.assertWithinBalance(balanceCents, target);

    const entry = await this.prisma.clientCredit.update({
      where: { id },
      data: { ...restoreData(user.id), updatedById: user.id },
      select: CREDIT_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'client_credit.restored',
      entityType: 'ClientCredit',
      entityId: id,
      metadata: { clientId: target.clientId },
    });

    return this.serialise(entry);
  }
}

import {
  BadRequestException,
  ConflictException,
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
import {
  QuoteStatus,
  TripRequestStatus,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  priceQuote,
  readLineItems,
  type PricedQuote,
  type QuoteLineItem,
} from './quotes.pricing.js';
import type {
  CreateQuoteInput,
  DecideQuoteInput,
  QueryQuotesInput,
  SendQuoteInput,
  UpdateQuoteInput,
} from './dto/quote.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const CLIENT_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    companyName: true,
    email: true,
    type: true,
    status: true,
    priority: true,
  },
} satisfies Prisma.ClientDefaultArgs;

const AIRPORT_SELECT = {
  select: { id: true, icao: true, iata: true, name: true, city: true },
} satisfies Prisma.AirportDefaultArgs;

const AIRCRAFT_SELECT = {
  select: {
    id: true,
    tailNumber: true,
    model: true,
    category: true,
    maxPassengers: true,
    rangeNm: true,
  },
} satisfies Prisma.AircraftDefaultArgs;

const OPERATOR_SELECT = {
  select: { id: true, name: true, status: true, reliabilityRating: true },
} satisfies Prisma.OperatorDefaultArgs;

/** The enquiry, enough of it to show what the quote answers. */
const REQUEST_SELECT = {
  select: {
    id: true,
    reference: true,
    status: true,
    assignedBrokerId: true,
    quoteDeadline: true,
  },
} satisfies Prisma.TripRequestDefaultArgs;

/**
 * The operator price this offer was built on.
 *
 * Carried on the quote so the margin is traceable to a real number somebody
 * was given, rather than to a figure retyped from another screen.
 */
const OPERATOR_QUOTE_SELECT = {
  select: {
    id: true,
    price: true,
    status: true,
    operator: { select: { id: true, name: true } },
  },
} satisfies Prisma.OperatorQuoteDefaultArgs;

/** Explicit select, never a bare row spread. */
const QUOTE_LIST_SELECT = {
  id: true,
  reference: true,
  clientId: true,
  client: CLIENT_SELECT,
  tripRequestId: true,
  tripRequest: REQUEST_SELECT,
  operatorQuoteId: true,
  assignedBrokerId: true,
  assignedBroker: ACTOR_SELECT,
  operatorId: true,
  operator: OPERATOR_SELECT,
  aircraftId: true,
  aircraft: AIRCRAFT_SELECT,
  quotedAircraft: true,
  originAirportId: true,
  originAirport: AIRPORT_SELECT,
  destinationAirportId: true,
  destinationAirport: AIRPORT_SELECT,
  departureDate: true,
  returnDate: true,
  passengers: true,
  basePrice: true,
  fetEnabled: true,
  fetRate: true,
  operatorCost: true,
  lineItems: true,
  depositAmount: true,
  status: true,
  version: true,
  sentAt: true,
  viewedAt: true,
  decidedAt: true,
  validUntil: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.QuoteSelect;

/**
 * The detail view extends the list's, never replaces it — and never uses
 * `include`, which returns every scalar plus only the relations it names and
 * silently drops the rest.
 */
const QUOTE_DETAIL_SELECT = {
  ...QUOTE_LIST_SELECT,
  terms: true,
  internalNotes: true,
  decisionNote: true,
  operatorQuote: OPERATOR_QUOTE_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.QuoteSelect;

const VERSION_SELECT = {
  id: true,
  version: true,
  basePrice: true,
  fetEnabled: true,
  fetRate: true,
  operatorCost: true,
  lineItems: true,
  fetAmount: true,
  extrasTotal: true,
  totalPrice: true,
  grossProfit: true,
  note: true,
  createdAt: true,
  createdBy: ACTOR_SELECT,
} satisfies Prisma.QuoteVersionSelect;

/** A quote still waiting on the client. */
const OPEN_STATUSES = [
  QuoteStatus.DRAFT,
  QuoteStatus.SENT,
  QuoteStatus.VIEWED,
] as const;

/** A quote the client has actually been shown. */
const DELIVERED_STATUSES = [QuoteStatus.SENT, QuoteStatus.VIEWED] as const;

type PricingRow = {
  basePrice: Prisma.Decimal;
  fetEnabled: boolean;
  fetRate: Prisma.Decimal;
  operatorCost: Prisma.Decimal | null;
  lineItems: Prisma.JsonValue;
  depositAmount?: Prisma.Decimal | null;
  validUntil?: Date | null;
  status?: QuoteStatus;
};

/** What the desk sees above the quotes board, counted rather than stored. */
export type QuoteStats = {
  total: number;
  draft: number;
  sent: number;
  viewed: number;
  approved: number;
  rejected: number;
  expired: number;
  awaitingResponse: number;
  expiringSoon: number;
  totalValue: number;
  approvedValue: number;
  averageMargin: number | null;
};

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---- Reading ------------------------------------------------------------

  /**
   * Whether this caller may see what the desk makes on a quote.
   *
   * A quote is two documents in one row: the offer, which a client sees, and
   * the margin, which nobody outside the desk should. An assistant preparing
   * paperwork needs the first and has no business with the second — which is
   * exactly how the permission matrix already scores VIEW_FINANCIALS
   * (ASSISTANT: NONE).
   */
  private seesFinancials(user: AuthenticatedUser): boolean {
    return scopeFor(user.role, Permission.VIEW_FINANCIALS) !== Scope.NONE;
  }

  /**
   * Decimal to number, the computed figures, and the two dates that must never
   * be stored as flags.
   *
   * `isExpired` is `validUntil` against today, worked out on every read. A
   * stored EXPIRED would be wrong from the moment the date passes until
   * something happens to write to the row — so a quote that lapsed on Friday
   * would still read "Sent" on Monday, and a broker would chase a price that
   * no longer stands.
   */
  private serialise<T extends PricingRow>(row: T, user: AuthenticatedUser) {
    const priced: PricedQuote = priceQuote(row);
    const financials = this.seesFinancials(user);

    const validUntil = row.validUntil ?? null;
    const endOfDay = validUntil ? new Date(validUntil) : null;
    if (endOfDay) endOfDay.setUTCHours(23, 59, 59, 999);

    const lapsed =
      endOfDay !== null &&
      Date.now() > endOfDay.getTime() &&
      (OPEN_STATUSES as readonly QuoteStatus[]).includes(
        row.status ?? QuoteStatus.DRAFT,
      );

    return {
      ...row,
      basePrice: priced.basePrice,
      fetRate: priced.fetRate,
      fetAmount: priced.fetAmount,
      extrasTotal: priced.extrasTotal,
      totalPrice: priced.totalPrice,
      lineItems: priced.lineItems,
      depositAmount:
        row.depositAmount === null || row.depositAmount === undefined
          ? null
          : Number(row.depositAmount),

      /**
       * Absent, not zeroed, for a caller without VIEW_FINANCIALS. A `0` margin
       * is a number an assistant could repeat down the phone; a missing key is
       * one the screen renders as "—".
       */
      ...(financials
        ? {
            operatorCost: priced.operatorCost,
            grossProfit: priced.grossProfit,
            marginPercentage: priced.marginPercentage,
          }
        : { operatorCost: undefined, grossProfit: undefined, marginPercentage: undefined }),

      /** Lapsed on the calendar while still open. Null when no expiry is set. */
      isExpired: endOfDay === null ? null : lapsed,
      daysUntilExpiry:
        endOfDay === null
          ? null
          : Math.ceil((endOfDay.getTime() - Date.now()) / 86_400_000),
    };
  }

  /**
   * Row-level visibility.
   *
   * A quote is owned by the broker it is assigned to, the same way a trip
   * request is. An unassigned quote is visible to everyone who can see quotes
   * at all — an offer nobody owns still has to be findable, or it is lost.
   */
  private visibilityScope(user: AuthenticatedUser): Prisma.QuoteWhereInput {
    if (scopeFor(user.role, Permission.VIEW_TRIPS) === Scope.ALL) return {};
    return {
      OR: [{ assignedBrokerId: user.id }, { assignedBrokerId: null }],
    };
  }

  async findAll(
    user: AuthenticatedUser,
    query: QueryQuotesInput,
  ): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.QuoteWhereInput = {
      ...archiveFilter(query.archived),
      ...this.visibilityScope(user),
      ...equalsAny(query, [
        'status',
        'clientId',
        'assignedBrokerId',
        'tripRequestId',
        'operatorId',
      ]),
      ...(query.openOnly ? { status: { in: [...OPEN_STATUSES] } } : {}),
      /**
       * Expiry is a date comparison, not a stored flag — see `serialise`. The
       * filter has to say the same thing the badge does, so it asks the same
       * question of the database.
       */
      ...(query.expired
        ? {
            validUntil: { lt: new Date() },
            status: { in: [...OPEN_STATUSES] },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { client: { firstName: { contains: query.search, mode: 'insensitive' } } },
              { client: { lastName: { contains: query.search, mode: 'insensitive' } } },
              { client: { companyName: { contains: query.search, mode: 'insensitive' } } },
              { operator: { name: { contains: query.search, mode: 'insensitive' } } },
              { quotedAircraft: { contains: query.search, mode: 'insensitive' } },
              { aircraft: { model: { contains: query.search, mode: 'insensitive' } } },
              { aircraft: { tailNumber: { contains: query.search, mode: 'insensitive' } } },
              { originAirport: { icao: { contains: query.search, mode: 'insensitive' } } },
              { destinationAirport: { icao: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        select: QUOTE_LIST_SELECT,
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.serialise(row, user)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Archived rows included — the Archived tab links straight here. A row
   * outside the caller's scope returns 404, never 403: a 403 confirms it
   * exists and turns any id into an oracle.
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.quote.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: QUOTE_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Quote not found');
    return this.serialise(row, user);
  }

  /**
   * The version history, newest first.
   *
   * Every figure comes back exactly as it was written — nothing here is
   * recomputed, which is the entire point of a snapshot.
   */
  async versionsFor(user: AuthenticatedUser, id: string) {
    await this.findOne(user, id);
    const financials = this.seesFinancials(user);

    const rows = await this.prisma.quoteVersion.findMany({
      where: { quoteId: id },
      select: VERSION_SELECT,
      orderBy: { version: 'desc' },
    });

    return rows.map((row) => ({
      ...row,
      basePrice: Number(row.basePrice),
      fetRate: Number(row.fetRate),
      fetAmount: Number(row.fetAmount),
      extrasTotal: Number(row.extrasTotal),
      totalPrice: Number(row.totalPrice),
      lineItems: readLineItems(row.lineItems),
      ...(financials
        ? {
            operatorCost:
              row.operatorCost === null ? null : Number(row.operatorCost),
            grossProfit:
              row.grossProfit === null ? null : Number(row.grossProfit),
          }
        : { operatorCost: undefined, grossProfit: undefined }),
    }));
  }

  /**
   * The board's tiles.
   *
   * Counted in JavaScript rather than summed in SQL, deliberately: the total
   * of a quote is derived from its parts (see `quotes.pricing.ts`), so there
   * is no `totalPrice` column for the database to add up. Summing `basePrice`
   * instead would quietly report a figure that is neither the offer nor the
   * revenue — it would leave out the tax and every extra.
   *
   * The cost is one scan of the live quotes in scope. If that stops being
   * cheap, the answer is a materialised total maintained on write, not a sum
   * of the wrong column.
   */
  async stats(user: AuthenticatedUser): Promise<QuoteStats> {
    const where: Prisma.QuoteWhereInput = {
      deletedAt: null,
      ...this.visibilityScope(user),
    };

    const rows = await this.prisma.quote.findMany({
      where,
      select: {
        status: true,
        basePrice: true,
        fetEnabled: true,
        fetRate: true,
        operatorCost: true,
        lineItems: true,
        validUntil: true,
      },
    });

    const soon = new Date();
    soon.setUTCDate(soon.getUTCDate() + 3);

    const counts = {
      total: rows.length,
      draft: 0,
      sent: 0,
      viewed: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
      awaitingResponse: 0,
      expiringSoon: 0,
      totalValue: 0,
      approvedValue: 0,
    };

    const margins: number[] = [];

    for (const row of rows) {
      const priced = priceQuote(row);
      counts.totalValue += priced.totalPrice;

      switch (row.status) {
        case QuoteStatus.DRAFT:
          counts.draft += 1;
          break;
        case QuoteStatus.SENT:
          counts.sent += 1;
          break;
        case QuoteStatus.VIEWED:
          counts.viewed += 1;
          break;
        case QuoteStatus.APPROVED:
          counts.approved += 1;
          counts.approvedValue += priced.totalPrice;
          break;
        case QuoteStatus.REJECTED:
          counts.rejected += 1;
          break;
        case QuoteStatus.EXPIRED:
          counts.expired += 1;
          break;
      }

      if ((DELIVERED_STATUSES as readonly QuoteStatus[]).includes(row.status)) {
        counts.awaitingResponse += 1;
        if (row.validUntil && row.validUntil <= soon) counts.expiringSoon += 1;
      }

      if (priced.marginPercentage !== null) margins.push(priced.marginPercentage);
    }

    counts.totalValue = Math.round(counts.totalValue * 100) / 100;
    counts.approvedValue = Math.round(counts.approvedValue * 100) / 100;

    /**
     * Null, not 0, when nothing has an operator cost against it yet. An
     * average margin of zero reads as "we make nothing", which is a different
     * statement from "we have not priced the cost side".
     */
    const averageMargin =
      this.seesFinancials(user) && margins.length > 0
        ? Math.round(
            (margins.reduce((a, b) => a + b, 0) / margins.length) * 10,
          ) / 10
        : null;

    return { ...counts, averageMargin };
  }

  // ---- Guards on what a quote may point at --------------------------------

  /** The same scoped lookup as `findOne`, live rows only. Guards every write. */
  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: {
        id: true,
        reference: true,
        status: true,
        version: true,
        clientId: true,
        tripRequestId: true,
        assignedBrokerId: true,
        operatorId: true,
        sentAt: true,
        basePrice: true,
        fetEnabled: true,
        fetRate: true,
        operatorCost: true,
        lineItems: true,
        depositAmount: true,
        validUntil: true,
      },
    });
    if (!row) throw new NotFoundException('Quote not found');
    return row;
  }

  /**
   * A referenced record must exist and be live.
   *
   * Archived and missing are told apart on purpose: "that operator does not
   * exist" about one sitting in the Archived tab sends someone hunting a typo
   * that is not there, and the fix for the two is different.
   */
  private async assertLive(
    model: 'client' | 'operator' | 'aircraft' | 'airport' | 'tripRequest' | 'operatorQuote',
    id: string | null | undefined,
    label: string,
  ): Promise<void> {
    if (!id) return;

    // A switch rather than an indexed delegate: Prisma's per-model argument
    // types do not unify, and casting them into a common shape would throw
    // away the checking that catches a renamed column.
    const where = { id };
    const select = { id: true, deletedAt: true } as const;
    const row = await (async () => {
      switch (model) {
        case 'client':
          return this.prisma.client.findUnique({ where, select });
        case 'operator':
          return this.prisma.operator.findUnique({ where, select });
        case 'aircraft':
          return this.prisma.aircraft.findUnique({ where, select });
        case 'airport':
          return this.prisma.airport.findUnique({ where, select });
        case 'tripRequest':
          return this.prisma.tripRequest.findUnique({ where, select });
        case 'operatorQuote':
          return this.prisma.operatorQuote.findUnique({ where, select });
      }
    })();

    if (!row) throw new BadRequestException(`That ${label} does not exist`);
    if (row.deletedAt) {
      throw new BadRequestException(
        `That ${label} is archived. Restore it before quoting against it.`,
      );
    }
  }

  /** The broker a quote is assigned to has to be someone who can work it. */
  private async assertBroker(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, status: true },
    });
    if (!user || user.deletedAt) {
      throw new BadRequestException('That broker does not exist');
    }
  }

  /**
   * Every link on the quote, validated in one place.
   *
   * Only what is actually changing: an edit form resends every field, so
   * re-checking unconditionally means a quote whose operator was archived last
   * week can never be edited again — changing its terms would fail over the
   * operator it already had.
   */
  private async assertLinks(
    input: CreateQuoteInput | UpdateQuoteInput,
    current?: { operatorId: string | null; clientId?: string },
  ): Promise<void> {
    const changed = <K extends keyof typeof input>(key: K, was: unknown) =>
      input[key] !== undefined && input[key] !== null && input[key] !== was;

    if ('clientId' in input && input.clientId !== undefined) {
      if (input.clientId !== current?.clientId) {
        await this.assertLive('client', input.clientId, 'client');
      }
    }
    if (changed('tripRequestId', undefined)) {
      await this.assertLive('tripRequest', input.tripRequestId, 'request');
    }
    if (changed('operatorQuoteId', undefined)) {
      await this.assertLive(
        'operatorQuote',
        input.operatorQuoteId,
        'operator quote',
      );
    }
    if (changed('operatorId', current?.operatorId)) {
      await this.assertLive('operator', input.operatorId, 'operator');
    }
    if (changed('aircraftId', undefined)) {
      await this.assertLive('aircraft', input.aircraftId, 'aircraft');
    }
    if (changed('originAirportId', undefined)) {
      await this.assertLive('airport', input.originAirportId, 'origin airport');
    }
    if (changed('destinationAirportId', undefined)) {
      await this.assertLive(
        'airport',
        input.destinationAirportId,
        'destination airport',
      );
    }
    if (changed('assignedBrokerId', undefined)) {
      await this.assertBroker(input.assignedBrokerId);
    }
  }

  /**
   * Archiving a quote is an administrator's call.
   *
   * Same rule as trip requests and operator quotes, for the same reason: a
   * quote the client turned down is evidence, and a broker quietly removing
   * their rejections improves their own conversion rate. Rejecting it keeps it
   * in the history where the desk's win rate is counted.
   */
  private assertMayArchive(user: AuthenticatedUser): void {
    if (scopeFor(user.role, Permission.DELETE_TRIPS) !== Scope.ALL) {
      throw new ForbiddenException(
        'Only administrators can remove a quote. Reject or expire it instead.',
      );
    }
  }

  // ---- Versions -----------------------------------------------------------

  /**
   * Freezes the quote's figures as version `version`.
   *
   * Written inside the same transaction as the change that caused it, so a
   * quote can never exist at V3 with no V3 in the log.
   */
  private versionData(
    quoteId: string,
    version: number,
    row: PricingRow,
    note: string | undefined,
    userId: string,
  ): Prisma.QuoteVersionUncheckedCreateInput {
    const priced = priceQuote(row);
    return {
      quoteId,
      version,
      basePrice: priced.basePrice,
      fetEnabled: row.fetEnabled,
      fetRate: priced.fetRate,
      operatorCost: priced.operatorCost,
      lineItems: priced.lineItems as unknown as Prisma.InputJsonValue,
      fetAmount: priced.fetAmount,
      extrasTotal: priced.extrasTotal,
      totalPrice: priced.totalPrice,
      grossProfit: priced.grossProfit,
      note: note ?? null,
      createdById: userId,
    };
  }

  /**
   * Whether an edit moved the money.
   *
   * Only a priced change cuts a new version. Correcting the FBO address or
   * fixing a spelling in the terms is not a new version of the offer, and
   * treating it as one would bury the three revisions that mattered under
   * twenty that did not.
   */
  private movesTheMoney(
    input: UpdateQuoteInput,
    current: PricingRow,
  ): boolean {
    if (input.basePrice !== undefined && input.basePrice !== Number(current.basePrice)) {
      return true;
    }
    if (input.fetEnabled !== undefined && input.fetEnabled !== current.fetEnabled) {
      return true;
    }
    if (input.fetRate !== undefined && input.fetRate !== Number(current.fetRate)) {
      return true;
    }
    if (
      input.operatorCost !== undefined &&
      (input.operatorCost ?? null) !==
        (current.operatorCost === null ? null : Number(current.operatorCost))
    ) {
      return true;
    }
    if (input.lineItems !== undefined) {
      const before = JSON.stringify(readLineItems(current.lineItems));
      const after = JSON.stringify(
        input.lineItems.map((item) => ({
          label: item.label,
          amount: item.amount ?? null,
          included: item.included,
        })) satisfies QuoteLineItem[],
      );
      if (before !== after) return true;
    }
    return false;
  }

  // ---- Writing ------------------------------------------------------------

  /**
   * A new offer. Always a DRAFT at V1 — nothing goes to a client by being
   * created.
   */
  async create(user: AuthenticatedUser, input: CreateQuoteInput) {
    await this.assertLinks(input);

    const { lineItems, ...rest } = input;
    const data = {
      ...rest,
      lineItems: (lineItems ?? []) as unknown as Prisma.InputJsonValue,
      /**
       * Falls back to the caller only when nobody was named. A broker writing
       * a quote owns it; an admin writing one on someone else's behalf says
       * so, and must not have it reassigned to themselves.
       */
      assignedBrokerId: input.assignedBrokerId ?? user.id,
      status: QuoteStatus.DRAFT,
      version: 1,
      createdById: user.id,
      updatedById: user.id,
    } satisfies Prisma.QuoteUncheckedCreateInput;

    const quote = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data,
        select: QUOTE_DETAIL_SELECT,
      });
      await tx.quoteVersion.create({
        data: this.versionData(created.id, 1, created, 'Initial quote', user.id),
      });
      return created;
    });

    await this.audit.record({
      actorId: user.id,
      action: 'quote.created',
      entityType: 'Quote',
      entityId: quote.id,
      metadata: {
        reference: quote.reference,
        clientId: quote.clientId,
        tripRequestId: quote.tripRequestId,
        basePrice: Number(quote.basePrice),
      },
    });

    return this.serialise(quote, user);
  }

  /**
   * Edit the offer.
   *
   * An approved or rejected quote is not editable: it is what the client
   * answered, and changing it retrospectively rewrites what they agreed to.
   * Reopen it first — that is a recorded act, and this is not.
   */
  async update(user: AuthenticatedUser, id: string, input: UpdateQuoteInput) {
    const current = await this.findLive(user, id);

    if (
      current.status === QuoteStatus.APPROVED ||
      current.status === QuoteStatus.REJECTED
    ) {
      throw new ConflictException(
        'This quote has been answered. Reopen it before changing the price.',
      );
    }

    await this.assertLinks(input, current);

    const { versionNote, lineItems, ...rest } = input;
    const newVersion = this.movesTheMoney(input, current)
      ? current.version + 1
      : current.version;

    const data: Prisma.QuoteUncheckedUpdateInput = {
      ...rest,
      ...(lineItems === undefined
        ? {}
        : { lineItems: lineItems as unknown as Prisma.InputJsonValue }),
      version: newVersion,
      updatedById: user.id,
    };

    const quote = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.quote.update({
        where: { id },
        data,
        select: QUOTE_DETAIL_SELECT,
      });
      if (newVersion !== current.version) {
        await tx.quoteVersion.create({
          data: this.versionData(id, newVersion, updated, versionNote, user.id),
        });
      }
      return updated;
    });

    if (newVersion !== current.version) {
      await this.audit.record({
        actorId: user.id,
        action: 'quote.revised',
        entityType: 'Quote',
        entityId: id,
        metadata: { version: newVersion, note: versionNote ?? null },
      });
    }

    return this.serialise(quote, user);
  }

  /**
   * Send it to the client.
   *
   * Stamps `sentAt` every time, not only the first: a revised quote that goes
   * out again genuinely went out again, and the client's decision window runs
   * from the version in their hand. The earlier sends are not lost — each one
   * has its version in the log.
   *
   * There is no mail here. Nothing in this system sends email to a client yet;
   * that arrives with Email Templates (#21), and pretending otherwise would
   * mean a broker believing a quote had been delivered when it had not.
   */
  async send(user: AuthenticatedUser, id: string, input: SendQuoteInput) {
    const current = await this.findLive(user, id);

    if (
      current.status === QuoteStatus.APPROVED ||
      current.status === QuoteStatus.REJECTED
    ) {
      throw new ConflictException(
        'This quote has already been answered. Reopen it to send a new price.',
      );
    }

    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.SENT,
        sentAt: new Date(),
        ...(input.validUntil ? { validUntil: input.validUntil } : {}),
        updatedById: user.id,
      },
      select: QUOTE_DETAIL_SELECT,
    });

    /**
     * The enquiry now has a price against it. Never backwards, and never over
     * a request already converted or lost — the same rule sourcing follows.
     */
    await this.advanceRequest(current.tripRequestId, user.id);

    await this.audit.record({
      actorId: user.id,
      action: 'quote.sent',
      entityType: 'Quote',
      entityId: id,
      metadata: {
        reference: current.reference,
        version: current.version,
        validUntil: quote.validUntil?.toISOString() ?? null,
        note: input.note ?? null,
      },
    });

    return this.serialise(quote, user);
  }

  /**
   * Moves the enquiry to QUOTED when its first price goes out.
   *
   * Forward only, and never over a request that has already converted or been
   * lost: a quote sent late on a dead enquiry must not resurrect it.
   */
  private async advanceRequest(
    tripRequestId: string | null,
    userId: string,
  ): Promise<void> {
    if (!tripRequestId) return;
    await this.prisma.tripRequest.updateMany({
      where: {
        id: tripRequestId,
        deletedAt: null,
        status: { in: [TripRequestStatus.OPEN, TripRequestStatus.SOURCING] },
      },
      data: { status: TripRequestStatus.QUOTED, updatedById: userId },
    });
  }

  /**
   * The client said yes.
   *
   * Two rules. A draft cannot be approved — nobody has seen it, so there is
   * nothing to agree to. And **only one quote per enquiry can be approved**: a
   * second is refused by name rather than silently demoting the first, because
   * two approved quotes on one enquiry mean two aircraft booked for one flight.
   *
   * An expired quote *can* be approved. The desk choosing to honour a lapsed
   * price is a real decision, and it stays visible because the expiry date is
   * still on the row.
   */
  async approve(user: AuthenticatedUser, id: string, input: DecideQuoteInput) {
    const current = await this.findLive(user, id);

    if (current.status === QuoteStatus.DRAFT) {
      throw new ConflictException(
        'This quote has not been sent yet. Send it before recording an answer.',
      );
    }
    if (current.status === QuoteStatus.APPROVED) {
      throw new ConflictException('This quote is already approved');
    }
    if (current.status === QuoteStatus.REJECTED) {
      throw new ConflictException(
        'This quote was rejected. Reopen it before approving.',
      );
    }

    if (current.tripRequestId) {
      const rival = await this.prisma.quote.findFirst({
        where: {
          tripRequestId: current.tripRequestId,
          status: QuoteStatus.APPROVED,
          deletedAt: null,
          id: { not: id },
        },
        select: { id: true, reference: true },
      });
      if (rival) {
        throw new ConflictException(
          `Quote Q-${rival.reference} is already approved for this request. Reopen it first.`,
        );
      }
    }

    return this.settle(user, id, QuoteStatus.APPROVED, input, 'quote.approved');
  }

  /** The client said no. The reason is what the next quote is priced against. */
  async reject(user: AuthenticatedUser, id: string, input: DecideQuoteInput) {
    const current = await this.findLive(user, id);

    if (current.status === QuoteStatus.DRAFT) {
      throw new ConflictException(
        'This quote has not been sent yet. There is nothing to reject.',
      );
    }
    if (current.status === QuoteStatus.REJECTED) {
      throw new ConflictException('This quote is already rejected');
    }

    return this.settle(user, id, QuoteStatus.REJECTED, input, 'quote.rejected');
  }

  /**
   * The offer lapsed.
   *
   * Explicit rather than automatic on purpose. A background job flipping
   * quotes to EXPIRED overnight would move rows nobody asked it to move, and
   * the desk's honouring of a lapsed price is a decision a person makes. The
   * `isExpired` flag already tells the truth on every read; this records that
   * the desk has let it go.
   */
  async expire(user: AuthenticatedUser, id: string, input: DecideQuoteInput) {
    const current = await this.findLive(user, id);

    if (!(OPEN_STATUSES as readonly QuoteStatus[]).includes(current.status)) {
      throw new ConflictException(
        'Only a quote still open can be marked expired',
      );
    }

    return this.settle(user, id, QuoteStatus.EXPIRED, input, 'quote.expired');
  }

  /**
   * Undo a decision.
   *
   * Goes back to where it was, not to DRAFT: a quote the client has seen
   * cannot become unsent. One that never went out returns to DRAFT, because
   * that is the truth about it.
   */
  async reopen(user: AuthenticatedUser, id: string) {
    const current = await this.findLive(user, id);

    if ((OPEN_STATUSES as readonly QuoteStatus[]).includes(current.status)) {
      throw new ConflictException('This quote is already open');
    }

    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        status: current.sentAt ? QuoteStatus.SENT : QuoteStatus.DRAFT,
        decidedAt: null,
        decisionNote: null,
        updatedById: user.id,
      },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'quote.reopened',
      entityType: 'Quote',
      entityId: id,
      metadata: { from: current.status, reference: current.reference },
    });

    return this.serialise(quote, user);
  }

  private async settle(
    user: AuthenticatedUser,
    id: string,
    status: QuoteStatus,
    input: DecideQuoteInput,
    action: string,
  ) {
    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        status,
        decidedAt: new Date(),
        ...(input.decisionNote === undefined
          ? {}
          : { decisionNote: input.decisionNote }),
        updatedById: user.id,
      },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action,
      entityType: 'Quote',
      entityId: id,
      metadata: {
        reference: quote.reference,
        note: input.decisionNote ?? null,
        totalPrice: priceQuote(quote).totalPrice,
      },
    });

    return this.serialise(quote, user);
  }

  /**
   * Copy an offer into a fresh draft.
   *
   * The desk quotes the same route repeatedly, and re-entering nine fields is
   * where a wrong airport gets typed. The copy starts at V1 as a DRAFT with no
   * send or decision history — it is a new offer, not a continuation of the
   * old one, and carrying the original's sent date across would misdate it.
   */
  async duplicate(user: AuthenticatedUser, id: string) {
    const source = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: QUOTE_DETAIL_SELECT,
    });
    if (!source) throw new NotFoundException('Quote not found');

    const copy = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          clientId: source.clientId,
          tripRequestId: source.tripRequestId,
          operatorQuoteId: source.operatorQuoteId,
          assignedBrokerId: source.assignedBrokerId ?? user.id,
          operatorId: source.operatorId,
          aircraftId: source.aircraftId,
          quotedAircraft: source.quotedAircraft,
          originAirportId: source.originAirportId,
          destinationAirportId: source.destinationAirportId,
          departureDate: source.departureDate,
          returnDate: source.returnDate,
          passengers: source.passengers,
          basePrice: source.basePrice,
          fetEnabled: source.fetEnabled,
          fetRate: source.fetRate,
          operatorCost: source.operatorCost,
          lineItems: source.lineItems as Prisma.InputJsonValue,
          depositAmount: source.depositAmount,
          terms: source.terms,
          internalNotes: source.internalNotes,
          status: QuoteStatus.DRAFT,
          version: 1,
          createdById: user.id,
          updatedById: user.id,
        },
        select: QUOTE_DETAIL_SELECT,
      });
      await tx.quoteVersion.create({
        data: this.versionData(
          created.id,
          1,
          created,
          `Duplicated from Q-${source.reference}`,
          user.id,
        ),
      });
      return created;
    });

    await this.audit.record({
      actorId: user.id,
      action: 'quote.duplicated',
      entityType: 'Quote',
      entityId: copy.id,
      metadata: { from: source.id, fromReference: source.reference },
    });

    return this.serialise(copy, user);
  }

  // ---- Archive ------------------------------------------------------------

  async remove(user: AuthenticatedUser, id: string) {
    this.assertMayArchive(user);
    const current = await this.findLive(user, id);

    const quote = await this.prisma.quote.update({
      where: { id },
      data: { ...archiveData(user.id), updatedById: user.id },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'quote.archived',
      entityType: 'Quote',
      entityId: id,
      metadata: { reference: current.reference, status: current.status },
    });

    return this.serialise(quote, user);
  }

  async restore(user: AuthenticatedUser, id: string) {
    this.assertMayArchive(user);

    const current = await this.prisma.quote.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: { id: true, reference: true, deletedAt: true },
    });
    if (!current) throw new NotFoundException('Quote not found');
    if (!current.deletedAt) {
      throw new ConflictException('That quote is not archived');
    }

    const quote = await this.prisma.quote.update({
      where: { id },
      data: { ...restoreData(user.id), updatedById: user.id },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'quote.restored',
      entityType: 'Quote',
      entityId: id,
      metadata: { reference: current.reference },
    });

    return this.serialise(quote, user);
  }

  async removeMany(
    user: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    this.assertMayArchive(user);

    const rows = await this.prisma.quote.findMany({
      where: { id: { in: ids }, deletedAt: null, ...this.visibilityScope(user) },
      select: { id: true, reference: true },
    });
    const targets = rows.map((row) => row.id);

    if (targets.length > 0) {
      await this.prisma.quote.updateMany({
        where: { id: { in: targets } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'quote.bulkArchived',
        entityType: 'Quote',
        metadata: { references: rows.map((row) => row.reference) },
      });
    }

    return bulkResult(ids, targets);
  }

  async restoreMany(
    user: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    this.assertMayArchive(user);

    const rows = await this.prisma.quote.findMany({
      where: {
        id: { in: ids },
        deletedAt: { not: null },
        ...this.visibilityScope(user),
      },
      select: { id: true, reference: true },
    });
    const targets = rows.map((row) => row.id);

    if (targets.length > 0) {
      await this.prisma.quote.updateMany({
        where: { id: { in: targets } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'quote.bulkRestored',
        entityType: 'Quote',
        metadata: { references: rows.map((row) => row.reference) },
      });
    }

    return bulkResult(ids, targets);
  }
}

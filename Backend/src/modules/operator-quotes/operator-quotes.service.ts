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
  OperatorQuoteStatus,
  TripRequestStatus,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateOperatorQuoteInput,
  DecideQuoteInput,
  QueryOperatorQuotesInput,
  RecordResponseInput,
  UpdateOperatorQuoteInput,
} from './dto/operator-quote.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

/**
 * The operator as a row, not a name.
 *
 * `status` rides along because the comparison view marks a preferred operator,
 * and `reliabilityRating` because it is the one number on the operator that is
 * genuinely a score — the broker choosing between two prices wants it beside
 * them.
 */
const OPERATOR_SELECT = {
  select: {
    id: true,
    name: true,
    status: true,
    homeBase: true,
    reliabilityRating: true,
    responseSpeed: true,
    contactEmail: true,
    generalEmail: true,
  },
} satisfies Prisma.OperatorDefaultArgs;

/** The tail, when the quote points at one we hold. */
const AIRCRAFT_SELECT = {
  select: {
    id: true,
    tailNumber: true,
    model: true,
    category: true,
    maxPassengers: true,
    rangeNm: true,
    amenities: true,
  },
} satisfies Prisma.AircraftDefaultArgs;

/** The enquiry, enough of it to render a quote row without a second call. */
const REQUEST_SELECT = {
  select: {
    id: true,
    reference: true,
    status: true,
    quoteDeadline: true,
    departureDate: true,
    estimatedValue: true,
    assignedBrokerId: true,
    client: {
      select: { id: true, firstName: true, lastName: true, companyName: true },
    },
    originAirport: { select: { id: true, icao: true, city: true } },
    destinationAirport: { select: { id: true, icao: true, city: true } },
  },
} satisfies Prisma.TripRequestDefaultArgs;

/** Explicit select, never a bare row spread — see the users module for why. */
const QUOTE_SELECT = {
  id: true,
  tripRequestId: true,
  tripRequest: REQUEST_SELECT,
  operatorId: true,
  operator: OPERATOR_SELECT,
  aircraftId: true,
  aircraft: AIRCRAFT_SELECT,
  suggestedAircraft: true,
  quotedAircraft: true,
  quotedTailNumber: true,
  price: true,
  amenities: true,
  terms: true,
  status: true,
  requestedAt: true,
  respondedAt: true,
  decisionNote: true,
  internalNotes: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.OperatorQuoteSelect;

const QUOTE_DETAIL_SELECT = {
  ...QUOTE_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.OperatorQuoteSelect;

/** A quote nobody has settled either way. */
const OPEN_STATUSES = [
  OperatorQuoteStatus.AWAITING_RESPONSE,
  OperatorQuoteStatus.RECEIVED,
];

/** A quote the broker has already ruled on. */
const DECIDED_STATUSES: OperatorQuoteStatus[] = [
  OperatorQuoteStatus.APPROVED,
  OperatorQuoteStatus.REJECTED,
  OperatorQuoteStatus.DECLINED,
];

type QuoteRow = {
  price: Prisma.Decimal | null;
  requestedAt: Date;
  respondedAt: Date | null;
  status: OperatorQuoteStatus;
  tripRequest?: { quoteDeadline: Date | null; estimatedValue: Prisma.Decimal | null } | null;
};

/** What the board shows per enquiry, counted rather than stored. */
export type SourcingSummary = {
  operatorsContacted: number;
  responses: number;
  approvedQuoteId: string | null;
  bestPrice: number | null;
  stage: 'REQUESTED' | 'PENDING_OPERATOR_QUOTE' | 'SOURCING' | 'SOURCE_COMPLETE';
};

@Injectable()
export class OperatorQuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Decimal to number, plus the two figures that must never be stored.
   *
   * `responseHours` is measured from the ask to the answer every time it is
   * read. A stored "2h" is right for one day and wrong forever after, and the
   * operator scorecard in scope §6.7 is built on response speed — a number the
   * desk judges operators by has to be recomputed.
   *
   * `isOverdue` is the enquiry's quote deadline against today, for the same
   * reason the aircraft maintenance badge is derived: a stored EXPIRED is
   * wrong from the moment the deadline passes until something writes to the
   * row.
   */
  private serialise<T extends QuoteRow>(row: T) {
    const responded = row.respondedAt;
    const deadline = row.tripRequest?.quoteDeadline ?? null;

    const endOfDeadlineDay = deadline ? new Date(deadline) : null;
    if (endOfDeadlineDay) endOfDeadlineDay.setUTCHours(23, 59, 59, 999);

    return {
      ...row,
      price: row.price === null ? null : Number(row.price),
      tripRequest: row.tripRequest
        ? {
            ...row.tripRequest,
            estimatedValue:
              row.tripRequest.estimatedValue === null
                ? null
                : Number(row.tripRequest.estimatedValue),
          }
        : row.tripRequest,
      /**
       * Hours from ask to answer, one decimal. Null while nobody has replied —
       * not 0, which would read as "answered instantly" and flatter an
       * operator who has not answered at all.
       */
      responseHours: responded
        ? Math.round(
            ((responded.getTime() - row.requestedAt.getTime()) / 3_600_000) * 10,
          ) / 10
        : null,
      /** Past the deadline with no answer in. Null when no deadline is set. */
      isOverdue:
        endOfDeadlineDay === null
          ? null
          : !responded && Date.now() > endOfDeadlineDay.getTime(),
    };
  }

  /**
   * Row-level visibility, inherited from the enquiry.
   *
   * A quote is not owned by anyone directly — it belongs to a trip request,
   * and a broker who may see the request may see what came back on it. Doing
   * it through the relation rather than copying `assignedBrokerId` onto the
   * quote keeps one answer to "whose enquiry is this": a reassignment moves
   * the quotes with it, automatically and without a backfill.
   */
  private visibilityScope(
    user: AuthenticatedUser,
  ): Prisma.OperatorQuoteWhereInput {
    if (scopeFor(user.role, Permission.VIEW_TRIPS) === Scope.ALL) return {};
    return {
      tripRequest: {
        OR: [{ assignedBrokerId: user.id }, { assignedBrokerId: null }],
      },
    };
  }

  /** The enquiry must exist, be live, and be one the caller can see. */
  private async assertRequest(user: AuthenticatedUser, id: string) {
    const request = await this.prisma.tripRequest.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(scopeFor(user.role, Permission.VIEW_TRIPS) === Scope.ALL
          ? {}
          : { OR: [{ assignedBrokerId: user.id }, { assignedBrokerId: null }] }),
      },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!request) {
      throw new BadRequestException(
        'That request does not exist, or is not yours to source',
      );
    }
    return request;
  }

  /**
   * The operator must exist and be live.
   *
   * Archived and missing are told apart on purpose: "that operator does not
   * exist" about an operator sitting in the Archived tab sends someone
   * looking for a typo that is not there.
   */
  private async assertOperator(id: string): Promise<void> {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!operator) {
      throw new BadRequestException('That operator does not exist');
    }
    if (operator.deletedAt) {
      throw new BadRequestException(
        'That operator is archived. Restore it before sourcing from it.',
      );
    }
  }

  /**
   * The tail must exist, be live, and actually belong to the operator quoting
   * it.
   *
   * The last part matters: a quote recording ExecuJet offering a tail on
   * VistaJet's certificate is a data-entry slip that would go on to price a
   * trip. When the operator flies something we do not hold, the free-text
   * fields carry it instead — that is what they are for.
   */
  private async assertAircraft(
    aircraftId: string | null | undefined,
    operatorId: string,
  ): Promise<void> {
    if (!aircraftId) return;
    const aircraft = await this.prisma.aircraft.findUnique({
      where: { id: aircraftId },
      select: { id: true, deletedAt: true, operatorId: true },
    });
    if (!aircraft) {
      throw new BadRequestException('That aircraft does not exist');
    }
    if (aircraft.deletedAt) {
      throw new BadRequestException('That aircraft is archived');
    }
    if (aircraft.operatorId !== operatorId) {
      throw new BadRequestException(
        'That aircraft is not on this operator’s certificate. Record it as a quoted aircraft instead.',
      );
    }
  }

  /**
   * Archiving a sourcing record is an administrator's call.
   *
   * Same rule as trip requests, and for the same reason: a quote that came in
   * over budget is evidence, and a broker quietly removing it improves their
   * own sourcing numbers. Reject it — that keeps it in the comparison and in
   * the operator's scorecard.
   */
  private assertMayArchive(user: AuthenticatedUser): void {
    if (scopeFor(user.role, Permission.DELETE_TRIPS) !== Scope.ALL) {
      throw new ForbiddenException(
        'Only administrators can remove a quote. Reject it instead.',
      );
    }
  }

  /**
   * Moves the enquiry along when sourcing does.
   *
   * OPEN becomes SOURCING the moment the first operator is asked, and SOURCING
   * becomes QUOTED when a quote is approved. Nothing here ever moves a request
   * backwards, and nothing touches one the desk has already closed out —
   * CONVERTED and LOST are decisions a person made, and sourcing activity must
   * not undo them.
   */
  private async advanceRequest(
    requestId: string,
    to: TripRequestStatus,
    userId: string,
  ): Promise<void> {
    const order: TripRequestStatus[] = [
      TripRequestStatus.OPEN,
      TripRequestStatus.SOURCING,
      TripRequestStatus.QUOTED,
    ];
    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    if (!request) return;

    const from = order.indexOf(request.status);
    const target = order.indexOf(to);
    if (from === -1 || target === -1 || target <= from) return;

    await this.prisma.tripRequest.update({
      where: { id: requestId },
      data: { status: to, updatedById: userId },
    });
  }

  async findAll(
    user: AuthenticatedUser,
    query: QueryOperatorQuotesInput,
  ): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.OperatorQuoteWhereInput = {
      ...archiveFilter(query.archived),
      ...this.visibilityScope(user),
      ...equalsAny(query, [
        'tripRequestId',
        'operatorId',
        'aircraftId',
        'status',
      ]),
      ...(query.openOnly ? { status: { in: OPEN_STATUSES } } : {}),
      ...(query.search
        ? {
            OR: [
              { operator: { name: { contains: query.search, mode: 'insensitive' } } },
              { quotedAircraft: { contains: query.search, mode: 'insensitive' } },
              { quotedTailNumber: { contains: query.search, mode: 'insensitive' } },
              { aircraft: { tailNumber: { contains: query.search, mode: 'insensitive' } } },
              { aircraft: { model: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.operatorQuote.findMany({
        where,
        select: QUOTE_SELECT,
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.operatorQuote.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.serialise(row)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Archived rows included — the Archived tab links straight here. Out of
   * scope returns 404, not 403: a 403 confirms the record exists.
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.operatorQuote.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: QUOTE_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Quote not found');
    return this.serialise(row);
  }

  /** The same scoped lookup, live rows only. Guards every write. */
  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.operatorQuote.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: {
        id: true,
        status: true,
        tripRequestId: true,
        operatorId: true,
        aircraftId: true,
        respondedAt: true,
      },
    });
    if (!row) throw new NotFoundException('Quote not found');
    return row;
  }

  /**
   * Send a request to an operator.
   *
   * A price may arrive with it: a broker on the phone gets the number before
   * the request is written down, and forcing two calls would record a response
   * time of zero for a quote that took a day.
   */
  async create(user: AuthenticatedUser, input: CreateOperatorQuoteInput) {
    await this.assertRequest(user, input.tripRequestId);
    await this.assertOperator(input.operatorId);
    await this.assertAircraft(input.aircraftId, input.operatorId);

    const existing = await this.prisma.operatorQuote.findFirst({
      where: {
        tripRequestId: input.tripRequestId,
        operatorId: input.operatorId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      // Checked here so the duplicate explains itself; the partial unique
      // index is what holds when two brokers send the same ask at once.
      throw new ConflictException(
        'This operator has already been asked for this request',
      );
    }

    const answered = input.price !== undefined && input.price !== null;
    const now = new Date();

    const quote = await this.prisma.operatorQuote.create({
      data: {
        ...input,
        status: answered
          ? OperatorQuoteStatus.RECEIVED
          : OperatorQuoteStatus.AWAITING_RESPONSE,
        requestedAt: now,
        // Same instant, deliberately: a price captured with the ask was given
        // on the call, so the response time is zero and honestly so.
        respondedAt: answered ? now : null,
        createdById: user.id,
        updatedById: user.id,
      },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.advanceRequest(
      input.tripRequestId,
      TripRequestStatus.SOURCING,
      user.id,
    );

    await this.audit.record({
      actorId: user.id,
      action: 'operatorQuote.requested',
      entityType: 'OperatorQuote',
      entityId: quote.id,
      metadata: {
        tripRequestId: input.tripRequestId,
        operatorId: input.operatorId,
        withPrice: answered,
      },
    });

    return this.serialise(quote);
  }

  /** Edit the ask or correct the answer. Does not move the quote's state. */
  async update(
    user: AuthenticatedUser,
    id: string,
    input: UpdateOperatorQuoteInput,
  ) {
    const target = await this.findLive(user, id);

    // Only validate a link that is actually changing: re-sending every field
    // on an edit must not fail over an aircraft the row already had.
    if (
      input.aircraftId !== undefined &&
      input.aircraftId !== null &&
      input.aircraftId !== target.aircraftId
    ) {
      await this.assertAircraft(input.aircraftId, target.operatorId);
    }

    const quote = await this.prisma.operatorQuote.update({
      where: { id },
      data: { ...input, updatedById: user.id },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'operatorQuote.updated',
      entityType: 'OperatorQuote',
      entityId: id,
      metadata: { fields: Object.keys(input) },
    });

    return this.serialise(quote);
  }

  /**
   * The operator came back.
   *
   * Stamps `respondedAt` once and never again: response time is measured from
   * the first answer, so correcting a price later through this endpoint must
   * not restart the clock and flatter the operator. Corrections go through
   * `update`.
   */
  async recordResponse(
    user: AuthenticatedUser,
    id: string,
    input: RecordResponseInput,
  ) {
    const target = await this.findLive(user, id);

    if (DECIDED_STATUSES.includes(target.status)) {
      throw new ConflictException(
        'This quote has already been decided. Reopen it before recording a new response.',
      );
    }

    if (input.aircraftId && input.aircraftId !== target.aircraftId) {
      await this.assertAircraft(input.aircraftId, target.operatorId);
    }

    const quote = await this.prisma.operatorQuote.update({
      where: { id },
      data: {
        ...input,
        status: OperatorQuoteStatus.RECEIVED,
        respondedAt: target.respondedAt ?? new Date(),
        updatedById: user.id,
      },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'operatorQuote.responded',
      entityType: 'OperatorQuote',
      entityId: id,
      metadata: { price: input.price ?? null },
    });

    return this.serialise(quote);
  }

  /**
   * Approve one quote — which is choosing the operator for the trip.
   *
   * Only one quote per enquiry can be approved, and a second attempt is
   * refused rather than silently demoting the first. Two approved quotes would
   * mean two operators booked for one flight, and the fix has to be a
   * deliberate act: reopen the one that was wrong, then approve the one that
   * is right.
   */
  async approve(user: AuthenticatedUser, id: string, input: DecideQuoteInput) {
    const target = await this.findLive(user, id);

    if (target.status === OperatorQuoteStatus.DECLINED) {
      throw new ConflictException(
        'That operator declined to quote, so there is nothing to approve',
      );
    }

    const approved = await this.prisma.operatorQuote.findFirst({
      where: {
        tripRequestId: target.tripRequestId,
        status: OperatorQuoteStatus.APPROVED,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true, operator: { select: { name: true } } },
    });
    if (approved) {
      throw new ConflictException(
        `${approved.operator.name} is already approved for this request. Reopen that quote first.`,
      );
    }

    const quote = await this.prisma.operatorQuote.update({
      where: { id },
      data: {
        status: OperatorQuoteStatus.APPROVED,
        decisionNote: input.decisionNote ?? null,
        // An approval on a quote nobody recorded a response for still means
        // the operator answered — otherwise there would be nothing to approve.
        respondedAt: target.respondedAt ?? new Date(),
        updatedById: user.id,
      },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.advanceRequest(
      target.tripRequestId,
      TripRequestStatus.QUOTED,
      user.id,
    );

    await this.audit.record({
      actorId: user.id,
      action: 'operatorQuote.approved',
      entityType: 'OperatorQuote',
      entityId: id,
      metadata: { tripRequestId: target.tripRequestId },
    });

    return this.serialise(quote);
  }

  /** The broker rules a quote out. It stays in the comparison and the scorecard. */
  async reject(user: AuthenticatedUser, id: string, input: DecideQuoteInput) {
    return this.settle(
      user,
      id,
      OperatorQuoteStatus.REJECTED,
      'operatorQuote.rejected',
      input,
    );
  }

  /** The operator declined to quote. Not the same as us rejecting them. */
  async decline(user: AuthenticatedUser, id: string, input: DecideQuoteInput) {
    return this.settle(
      user,
      id,
      OperatorQuoteStatus.DECLINED,
      'operatorQuote.declined',
      input,
    );
  }

  private async settle(
    user: AuthenticatedUser,
    id: string,
    status: OperatorQuoteStatus,
    action: string,
    input: DecideQuoteInput,
  ) {
    const target = await this.findLive(user, id);

    const quote = await this.prisma.operatorQuote.update({
      where: { id },
      data: {
        status,
        decisionNote: input.decisionNote ?? null,
        // A decline is an answer: the operator came back, the answer was no.
        // Leaving respondedAt null would count it as never having replied and
        // hide it from their response rate.
        respondedAt: target.respondedAt ?? new Date(),
        updatedById: user.id,
      },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action,
      entityType: 'OperatorQuote',
      entityId: id,
      metadata: { tripRequestId: target.tripRequestId },
    });

    return this.serialise(quote);
  }

  /**
   * Undo a decision.
   *
   * A mis-click on Approve would otherwise be unfixable — the UI disables both
   * buttons once a quote is decided, which is correct and leaves no way back
   * without this.
   */
  async reopen(user: AuthenticatedUser, id: string) {
    const target = await this.findLive(user, id);

    if (!DECIDED_STATUSES.includes(target.status)) {
      throw new ConflictException('This quote has not been decided yet');
    }

    const quote = await this.prisma.operatorQuote.update({
      where: { id },
      data: {
        status: target.respondedAt
          ? OperatorQuoteStatus.RECEIVED
          : OperatorQuoteStatus.AWAITING_RESPONSE,
        decisionNote: null,
        updatedById: user.id,
      },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'operatorQuote.reopened',
      entityType: 'OperatorQuote',
      entityId: id,
      metadata: { from: target.status },
    });

    return this.serialise(quote);
  }

  /**
   * What the sourcing board shows per enquiry, counted rather than stored.
   *
   * The screen's four statuses — Requested, Pending Operator Quote, Sourcing,
   * Source Complete — describe how far sourcing has got, which is a fact about
   * the quotes and not a field anyone should be able to set. Derived here for
   * the same reason the maintenance badge is: a stored stage is wrong the
   * moment the next operator replies.
   *
   * One query for any number of enquiries, so the board does not issue a
   * request per row.
   */
  async summaryFor(
    tripRequestIds: string[],
  ): Promise<Map<string, SourcingSummary>> {
    const summaries = new Map<string, SourcingSummary>();
    if (tripRequestIds.length === 0) return summaries;

    const rows = await this.prisma.operatorQuote.findMany({
      where: { tripRequestId: { in: tripRequestIds }, deletedAt: null },
      select: {
        id: true,
        tripRequestId: true,
        status: true,
        price: true,
        respondedAt: true,
      },
    });

    for (const id of tripRequestIds) {
      const quotes = rows.filter((row) => row.tripRequestId === id);
      const responded = quotes.filter((row) => row.respondedAt !== null);
      const approved = quotes.find(
        (row) => row.status === OperatorQuoteStatus.APPROVED,
      );

      // Only priced answers count towards "best": a decline has no price, and
      // an unanswered ask has none yet.
      const prices = quotes
        .filter((row) => row.price !== null)
        .map((row) => Number(row.price));

      summaries.set(id, {
        operatorsContacted: quotes.length,
        responses: responded.length,
        approvedQuoteId: approved?.id ?? null,
        bestPrice: prices.length ? Math.min(...prices) : null,
        stage: approved
          ? 'SOURCE_COMPLETE'
          : quotes.length === 0
            ? 'REQUESTED'
            : responded.length === 0
              ? 'PENDING_OPERATOR_QUOTE'
              : 'SOURCING',
      });
    }

    return summaries;
  }

  /**
   * One operator's sourcing record, for their detail page.
   *
   * Scope §6.7 asks for an operator scorecard — response speed, win rate, how
   * often they came in over budget. These three are the part of it the data
   * can actually answer today, counted from real quotes.
   *
   * **The rest of the scorecard is deliberately not here.** Accuracy, hidden
   * fees, cabin cleanliness, crew quality and passenger feedback are in the
   * scope too, and §17 lists "operator scorecard rating scales" as a decision
   * nobody has made. Inventing a scale to fill those in would put a score on
   * an operator that no one gave them — the exact failure that made "never
   * display a number the data did not supply" the hardest rule in this
   * project.
   *
   * Every figure is null rather than 0 when there is nothing to measure. An
   * operator we have never asked has no response time, and "0h" would make
   * them look like the fastest on the desk.
   */
  async scorecardFor(operatorId: string) {
    const quotes = await this.prisma.operatorQuote.findMany({
      where: { operatorId, deletedAt: null },
      select: {
        status: true,
        requestedAt: true,
        respondedAt: true,
      },
    });

    const answered = quotes.filter((row) => row.respondedAt !== null);
    const decided = quotes.filter(
      (row) =>
        row.status === OperatorQuoteStatus.APPROVED ||
        row.status === OperatorQuoteStatus.REJECTED,
    );
    const won = decided.filter(
      (row) => row.status === OperatorQuoteStatus.APPROVED,
    );
    const hours = answered.map(
      (row) =>
        ((row.respondedAt as Date).getTime() - row.requestedAt.getTime()) /
        3_600_000,
    );

    return {
      quotesRequested: quotes.length,
      quotesReceived: answered.length,
      quotesWon: won.length,
      quotesDeclined: quotes.filter(
        (row) => row.status === OperatorQuoteStatus.DECLINED,
      ).length,
      /** Percent of asks they answered at all. Null before we ever asked. */
      responseRate: quotes.length
        ? Math.round((answered.length / quotes.length) * 100)
        : null,
      /** Percent of decided quotes they won. Null before anything was decided. */
      winRate: decided.length
        ? Math.round((won.length / decided.length) * 100)
        : null,
      /** Average hours to reply. Null until at least one reply exists. */
      averageResponseHours: hours.length
        ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10
        : null,
      /** When we last asked them. Null if we never have. */
      lastRequestedAt:
        quotes.length === 0
          ? null
          : new Date(
              Math.max(...quotes.map((row) => row.requestedAt.getTime())),
            ),
    };
  }

  /**
   * The tiles above the sourcing board, scoped like the list.
   *
   * `averageResponseHours` is computed from the quotes that actually have an
   * answer. Null when none do — not 0, which would read as "every operator
   * replies instantly" on a desk that has just started sourcing.
   */
  async stats(user: AuthenticatedUser) {
    const base: Prisma.OperatorQuoteWhereInput = {
      deletedAt: null,
      ...this.visibilityScope(user),
    };

    const [awaiting, received, approved, rejected, declined, answered] =
      await this.prisma.$transaction([
        this.prisma.operatorQuote.count({
          where: { ...base, status: OperatorQuoteStatus.AWAITING_RESPONSE },
        }),
        this.prisma.operatorQuote.count({
          where: { ...base, status: OperatorQuoteStatus.RECEIVED },
        }),
        this.prisma.operatorQuote.count({
          where: { ...base, status: OperatorQuoteStatus.APPROVED },
        }),
        this.prisma.operatorQuote.count({
          where: { ...base, status: OperatorQuoteStatus.REJECTED },
        }),
        this.prisma.operatorQuote.count({
          where: { ...base, status: OperatorQuoteStatus.DECLINED },
        }),
        this.prisma.operatorQuote.findMany({
          where: { ...base, respondedAt: { not: null } },
          select: { requestedAt: true, respondedAt: true },
        }),
      ]);

    const hours = answered.map(
      (row) =>
        ((row.respondedAt as Date).getTime() - row.requestedAt.getTime()) /
        3_600_000,
    );

    return {
      awaitingResponse: awaiting,
      received,
      approved,
      rejected,
      declined,
      total: awaiting + received + approved + rejected + declined,
      averageResponseHours: hours.length
        ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10
        : null,
    };
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertMayArchive(user);
    const target = await this.findLive(user, id);

    await this.prisma.operatorQuote.update({
      where: { id },
      data: archiveData(user.id),
    });

    await this.audit.record({
      actorId: user.id,
      action: 'operatorQuote.archived',
      entityType: 'OperatorQuote',
      entityId: id,
      metadata: { tripRequestId: target.tripRequestId },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    this.assertMayArchive(user);

    const target = await this.prisma.operatorQuote.findFirst({
      where: { id, deletedAt: { not: null }, ...this.visibilityScope(user) },
      select: { id: true, tripRequestId: true, operatorId: true },
    });
    if (!target) throw new NotFoundException('Archived quote not found');

    // The live-only uniqueness means restoring can collide with an ask that
    // was re-sent in the meantime. Say so, rather than surfacing a constraint.
    const clash = await this.prisma.operatorQuote.findFirst({
      where: {
        tripRequestId: target.tripRequestId,
        operatorId: target.operatorId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'This operator has since been asked again for this request',
      );
    }

    const quote = await this.prisma.operatorQuote.update({
      where: { id },
      data: { ...restoreData(user.id), updatedById: user.id },
      select: QUOTE_DETAIL_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'operatorQuote.restored',
      entityType: 'OperatorQuote',
      entityId: id,
      metadata: { tripRequestId: target.tripRequestId },
    });

    return this.serialise(quote);
  }

  async removeMany(
    user: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    this.assertMayArchive(user);

    const live = await this.prisma.operatorQuote.findMany({
      where: { id: { in: ids }, deletedAt: null, ...this.visibilityScope(user) },
      select: { id: true },
    });
    const target = live.map((row) => row.id);

    if (target.length) {
      await this.prisma.operatorQuote.updateMany({
        where: { id: { in: target } },
        data: archiveData(user.id),
      });
      await this.audit.record({
        actorId: user.id,
        action: 'operatorQuote.archivedMany',
        entityType: 'OperatorQuote',
        entityId: target.join(','),
        metadata: { count: target.length },
      });
    }

    return bulkResult(ids, target);
  }

  async restoreMany(
    user: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    this.assertMayArchive(user);

    const archived = await this.prisma.operatorQuote.findMany({
      where: {
        id: { in: ids },
        deletedAt: { not: null },
        ...this.visibilityScope(user),
      },
      select: { id: true, tripRequestId: true, operatorId: true },
    });

    // Restore only the ones whose operator has not been asked again since.
    // The rest are reported as skipped rather than failing the whole batch.
    const live = await this.prisma.operatorQuote.findMany({
      where: {
        tripRequestId: { in: archived.map((row) => row.tripRequestId) },
        deletedAt: null,
      },
      select: { tripRequestId: true, operatorId: true },
    });
    const taken = new Set(
      live.map((row) => `${row.tripRequestId}:${row.operatorId}`),
    );
    const target = archived
      .filter((row) => !taken.has(`${row.tripRequestId}:${row.operatorId}`))
      .map((row) => row.id);

    if (target.length) {
      await this.prisma.operatorQuote.updateMany({
        where: { id: { in: target } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'operatorQuote.restoredMany',
        entityType: 'OperatorQuote',
        entityId: target.join(','),
        metadata: { count: target.length },
      });
    }

    return bulkResult(ids, target);
  }
}
